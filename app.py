
import io
import sqlite3
import string
import random
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove

# --- Database Setup ---
DB_NAME = "premium_codes.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def create_table_if_not_exists():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS codes (
            code TEXT PRIMARY KEY,
            expires_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

# --- Code Validation ---
def is_code_valid(code: str, conn: sqlite3.Connection):
    if not code:
        return False
    cursor = conn.cursor()
    cursor.execute("SELECT expires_at FROM codes WHERE code = ?", (code,))
    record = cursor.fetchone()
    if record:
        expires_at = datetime.fromisoformat(record["expires_at"])
        if datetime.utcnow() < expires_at:
            return True
    return False

# --- Code Generation ---
def generate_unique_code(conn: sqlite3.Connection):
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM codes WHERE code = ?", (code,))
        if cursor.fetchone() is None:
            return code

app = FastAPI()

# Call on startup
create_table_if_not_exists()

# --- CORS Configuration ---
origins = [
    "https://carleyinteractivestudio.github.io",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---
ADMIN_SECRET = "your_super_secret_key" # In a real app, use environment variables

@app.post("/generate-code/")
def generate_code(days: int, secret: str, conn: sqlite3.Connection = Depends(get_db)):
    """
    Generates a new premium code.
    Requires a secret admin key for authorization.
    """
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        expires_at = datetime.utcnow() + timedelta(days=days)
        new_code = generate_unique_code(conn)

        cursor = conn.cursor()
        cursor.execute("INSERT INTO codes (code, expires_at) VALUES (?, ?)", (new_code, expires_at.isoformat()))
        conn.commit()

        return {"premium_code": new_code, "valid_until": expires_at.isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating code: {str(e)}")

@app.post("/remove-background/")
async def remove_background(
    image: UploadFile = File(...),
    premium_code: Optional[str] = Form(None),
    conn: sqlite3.Connection = Depends(get_db)
):
    # Priority logic
    if not is_code_valid(premium_code, conn):
        await asyncio.sleep(2) # Artificial delay for non-premium users

    try:
        input_bytes = await image.read()
        output_bytes = remove(input_bytes)
        return StreamingResponse(io.BytesIO(output_bytes), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing background: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "VidSpri Backend is running with Premium Code support"}

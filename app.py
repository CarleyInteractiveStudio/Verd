
import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session

app = FastAPI()

# --- Model Session ---
# Create a session with the desired model
session = new_session("isnet-anime")

# --- CORS Configuration ---
origins = [
    "https://carleyinteractivestudio.github.io",
    # You can add "http://localhost:8000" here for local testing if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/remove-background/")
async def remove_background(image: UploadFile = File(...)):
    """
    Accepts an image file, removes its background, and returns the processed image.
    """
    try:
        input_bytes = await image.read()
        # Use the session to remove the background
        output_bytes = remove(input_bytes, session=session)
        return StreamingResponse(io.BytesIO(output_bytes), media_type="image/png")
    except Exception as e:
        # Log the error for debugging purposes if you have a logging system
        # print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Error removing background: {str(e)}")

@app.get("/")
def read_root():
    """
    Root endpoint to confirm the server is running.
    """
    return {"status": "VidSpri Backend is running"}

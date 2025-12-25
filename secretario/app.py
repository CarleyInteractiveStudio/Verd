
import uuid
import asyncio
import os
import base64
import httpx
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
import database
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- Configuration ---
ESPECIALISTA_URL = os.environ.get("ESPECIALISTA_URL", "URL_DEL_ESPECIALISTA_AQUI/remove-background/")
# Asegúrate de reemplazar "URL_DEL_ESPECIALISTA_AQUI" con la URL real de tu Hugging Face Space.

# --- App Initialization ---
database.initialize_database()

# --- Security ---
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "_a_default_secret_key_that_should_be_changed_")
api_key_header = APIKeyHeader(name="X-Admin-API-Key", auto_error=False)

def get_api_key(api_key: str = Depends(api_key_header)):
    if not ADMIN_API_KEY or api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

# --- CORS Configuration ---
origins = ["https://carleyinteractivestudio.github.io", "http://localhost:8002", "null"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Public API Endpoints ---

@app.post("/remove-background/")
async def queue_job(images: List[UploadFile] = File(...)):
    if not images:
        raise HTTPException(status_code=400, detail="No images were provided.")
    job_id = str(uuid.uuid4())
    frames_data = [await image.read() for image in images]
    position = database.add_job_and_frames(job_id, frames_data)
    return {"job_id": job_id, "queue_position": position, "status": "queued", "total_frames": len(frames_data), "completed_frames": 0}

@app.get("/status/{job_id}")
def get_status(job_id: str):
    job_info = database.get_job_status(job_id)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job not found")
    if job_info['status'] == 'completed':
        encoded_frames = [base64.b64encode(frame_data).decode('utf-8') for frame_data in job_info['frames']]
        return JSONResponse(content={"status": "completed", "frames": encoded_frames})
    return job_info

@app.post("/apply-code")
async def apply_code(job_id: str = Form(...), code: str = Form(...)):
    if not database.get_job_status(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    if not database.validate_code(code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    database.use_code(code)
    new_position = database.apply_priority_code_and_reorder(job_id)
    return {"message": f"Success! Your request has been moved to position #{new_position}.", "job_id": job_id, "new_queue_position": new_position}

# --- Admin API Endpoints ---

@app.get("/admin/codes", dependencies=[Depends(get_api_key)])
def get_all_codes_admin():
    return database.get_all_codes()

@app.post("/admin/codes", dependencies=[Depends(get_api_key)])
def create_code_admin(uses: int = Form(...)):
    if uses <= 0:
        raise HTTPException(status_code=400, detail="Uses must be a positive integer.")
    new_code = database.generate_code()
    database.add_code(new_code, uses)
    return {"code": new_code, "uses": uses, "total_uses": uses}

@app.delete("/admin/codes/{code}", dependencies=[Depends(get_api_key)])
def delete_code_admin(code: str):
    database.delete_code(code)
    return {"message": f"Code {code} deleted successfully."}

# --- Background Worker ---
async def process_frame_remotely(image_data: bytes) -> bytes:
    """Sends a single frame to the 'especialista' service and gets the result."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        files = {'file': ('image.png', image_data, 'image/png')}
        response = await client.post(ESPECIALISTA_URL, files=files)
        response.raise_for_status()  # Will raise an exception for 4XX/5XX responses
        return response.content

async def worker():
    """The main worker loop that processes jobs from the queue."""
    logger.info("Worker started.")
    while True:
        frame_to_process = await asyncio.to_thread(database.get_next_frame_to_process)
        if frame_to_process:
            job_id = frame_to_process['job_id']
            frame_order = frame_to_process['frame_order']
            try:
                job_info = await asyncio.to_thread(database.get_job_status, job_id)
                if job_info and job_info['status'] == 'queued':
                    logger.info(f"Starting processing for job {job_id}")
                    await asyncio.to_thread(database.set_job_status, job_id, "processing")

                logger.info(f"Processing frame {frame_order} for job {job_id}")
                output_bytes = await process_frame_remotely(frame_to_process['image_data'])
                await asyncio.to_thread(database.update_frame_as_completed, job_id, frame_order, output_bytes)
                logger.info(f"Completed frame {frame_order} for job {job_id}")

            except Exception as e:
                logger.error(f"Error processing frame {frame_order} for job {job_id}: {e}")
                await asyncio.to_thread(database.set_job_status, job_id, "failed")
        else:
            await asyncio.sleep(2)

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup...")
    asyncio.create_task(worker())

@app.get("/")
def read_root():
    return {"status": "Secretario Service is running"}

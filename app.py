
import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session

app = FastAPI()

import database
import secrets
import time
import asyncio
from fastapi import BackgroundTasks, HTTPException

# --- App Initialization ---
# Initialize the database on startup
database.initialize_database()

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

import uuid

@app.post("/remove-background/")
async def queue_job(image: UploadFile = File(...)):
    """
    Accepts an image file, adds it to the processing queue,
    and returns a job ID and queue position.
    """
    try:
        input_bytes = await image.read()
        job_id = str(uuid.uuid4())

        position = database.add_job(job_id, input_bytes)

        return {"job_id": job_id, "queue_position": position, "status": "queued"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error queuing job: {str(e)}")

@app.get("/status/{job_id}")
def get_status(job_id: str):
    """
    Retrieves the status and result of a processing job.
    """
    job = database.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job['status'] == 'completed':
        return StreamingResponse(io.BytesIO(job['result_data']), media_type="image/png")

    return {"job_id": job['job_id'], "status": job['status'], "queue_position": job['queue_position']}

@app.post("/apply-code")
def apply_code(job_id: str, code: str):
    """
    Applies a priority code to an existing job.
    """
    job = database.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not database.validate_code(code):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    database.use_code(code)
    new_position = database.apply_priority_code_and_reorder(job_id)

    old_position = job['queue_position']
    return {
        "message": f"Success! Your request, which was at position #{old_position}, has been moved to position #{new_position}.",
        "job_id": job_id,
        "new_queue_position": new_position
    }

# --- Background Worker ---
async def process_queue():
    """
    A worker that runs in the background to process jobs from the queue.
    """
    while True:
        job = database.get_next_job_in_queue()
        if job:
            try:
                print(f"Processing job: {job['job_id']}")
                database.update_job_status_and_result(job['job_id'], "processing")

                # Perform the background removal
                output_bytes = remove(job['image_data'], session=session)

                database.update_job_status_and_result(job['job_id'], "completed", output_bytes)
                database.reorder_queue_after_completion()
                print(f"Finished job: {job['job_id']}")
            except Exception as e:
                print(f"Error processing job {job['job_id']}: {e}")
                database.update_job_status_and_result(job['job_id'], "failed")
        else:
            # Wait for a bit before checking for new jobs
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    """
    Start the background worker when the application starts.
    """
    print("Starting background worker...")
    asyncio.create_task(process_queue())

# This is the root endpoint to confirm the server is running.
@app.get("/")
def read_root():
    """
    Root endpoint to confirm the server is running.
    """
    return {"status": "VidSpri Backend is running"}


import io
import uuid
import time
import asyncio
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove, new_session
import database

app = FastAPI()

# --- App Initialization & Model Session ---
database.initialize_database()
session = new_session("isnet-anime")

# --- CORS Configuration ---
origins = ["https://carleyinteractivestudio.github.io"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.post("/remove-background/")
async def queue_job(images: List[UploadFile] = File(...)):
    """
    Accepts multiple image files (frames), creates a single job,
    and returns a job ID and queue position.
    """
    try:
        job_id = str(uuid.uuid4())
        frames_data = [await image.read() for image in images]

        position = database.add_job_and_frames(job_id, frames_data)

        return {"job_id": job_id, "queue_position": position, "status": "queued"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error queuing job: {str(e)}")

@app.get("/status/{job_id}")
def get_status(job_id: str):
    """
    Retrieves the aggregated status of a processing job.
    If completed, returns all processed frames.
    """
    job_info = database.get_job_status(job_id)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job not found")

    if job_info['status'] == 'completed':
        # This is a custom way to send multiple images back.
        # We can't use StreamingResponse for multiple files easily.
        # A real-world app might zip them, but for now, we send them as a list of data URLs.
        return JSONResponse(content={
            "status": "completed",
            "frames": job_info['frames']
        })

    return job_info

@app.post("/apply-code")
def apply_code(job_id: str, code: str):
    """
    Applies a priority code to an existing job.
    """
    # We get the job status to check its existence and current position
    job = database.get_job_status(job_id)
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
    A worker that runs in the background to process individual frames from the queue.
    """
    while True:
        frame_to_process = database.get_next_frame_to_process()
        if frame_to_process:
            job_id = frame_to_process['job_id']
            frame_order = frame_to_process['frame_order']
            try:
                print(f"Processing frame {frame_order} for job {job_id}")
                database.update_frame_status(job_id, frame_order, "processing")

                output_bytes = remove(frame_to_process['image_data'], session=session)

                database.update_frame_as_completed(job_id, frame_order, output_bytes)
                print(f"Finished frame {frame_order} for job {job_id}")
            except Exception as e:
                print(f"Error processing frame {frame_order} for job {job_id}: {e}")
                database.update_frame_status(job_id, frame_order, "failed")
        else:
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    print("Starting background worker...")
    asyncio.create_task(process_queue())

@app.get("/")
def read_root():
    return {"status": "VidSpri Backend is running"}

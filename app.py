from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import io
import cv2
import numpy as np
from rembg import remove
import tempfile
import os
from typing import Optional

app = FastAPI()

# Serve static files from the root directory
app.mount("/", StaticFiles(directory=".", html=True), name="static")

@app.post("/generate-sprite/")
async def generate_sprite(
    video_file: UploadFile = File(...),
    frames: int = Form(...),
    start_time: Optional[float] = Form(None),
    end_time: Optional[float] = Form(None)
):
    # Save the uploaded file to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        content = await video_file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps

        if total_frames == 0 or fps == 0:
            raise HTTPException(status_code=400, detail="Video has no frames or invalid metadata")

        start_frame = 0
        end_frame = total_frames - 1

        if start_time is not None and end_time is not None:
            if start_time < 0 or end_time < 0:
                raise HTTPException(status_code=400, detail="Start and end times cannot be negative.")
            if start_time >= end_time:
                raise HTTPException(status_code=400, detail="End time must be greater than start time.")
            if end_time > duration:
                end_time = duration # Clamp to video duration

            start_frame = int(start_time * fps)
            end_frame = int(end_time * fps)

        frame_indices = np.linspace(start_frame, end_frame, num=frames, dtype=int)

        processed_frames = []
        for i in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                _, img_encoded = cv2.imencode('.png', frame)
                img_bytes = img_encoded.tobytes()
                output_bytes = remove(img_bytes)
                output_np = np.frombuffer(output_bytes, np.uint8)
                processed_frame = cv2.imdecode(output_np, cv2.IMREAD_UNCHANGED)
                if processed_frame is not None:
                    processed_frames.append(processed_frame)

        cap.release()

        if not processed_frames:
            raise HTTPException(status_code=500, detail="Could not process any frames from the selected range.")

        four_channel_frames = []
        for f in processed_frames:
            if f.shape[2] == 3:
                f = cv2.cvtColor(f, cv2.COLOR_BGR2BGRA)
            four_channel_frames.append(f)

        if not four_channel_frames:
            raise HTTPException(status_code=500, detail="No valid frames to process after channel conversion.")

        max_height = max(f.shape[0] for f in four_channel_frames)
        total_width = sum(f.shape[1] for f in four_channel_frames)

        sprite_sheet = np.zeros((max_height, total_width, 4), dtype=np.uint8)
        current_x = 0
        for frame in four_channel_frames:
            h, w, _ = frame.shape
            sprite_sheet[0:h, current_x:current_x+w] = frame
            current_x += w

        is_success, sprite_encoded = cv2.imencode('.png', sprite_sheet)
        if not is_success:
            raise HTTPException(status_code=500, detail="Failed to encode sprite sheet.")

        sprite_bytes = sprite_encoded.tobytes()

        return StreamingResponse(io.BytesIO(sprite_bytes), media_type="image/png", headers={"Content-Disposition": "attachment; filename=sprite.png"})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

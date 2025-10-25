from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
import io
import cv2
import numpy as np
from rembg import remove
import tempfile
import os

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "VidSpri Backend is running!"}

@app.post("/generate-sprite/")
async def generate_sprite(
    video_file: UploadFile = File(...),
    frames: int = Form(...)
):
    # Save the uploaded file to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        content = await video_file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            return {"error": "Could not open video file"}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames == 0:
            return {"error": "Video has no frames"}

        frame_indices = np.linspace(0, total_frames - 1, num=frames, dtype=int)

        processed_frames = []
        for i in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                # Convert frame to PNG bytes for rembg
                _, img_encoded = cv2.imencode('.png', frame)
                img_bytes = img_encoded.tobytes()

                # Remove background
                output_bytes = remove(img_bytes)

                # Decode the image with alpha channel
                output_np = np.frombuffer(output_bytes, np.uint8)
                processed_frame = cv2.imdecode(output_np, cv2.IMREAD_UNCHANGED)
                if processed_frame is not None:
                    processed_frames.append(processed_frame)

        cap.release()

        if not processed_frames:
            return {"error": "Could not process any frames"}

        # Ensure all frames have 4 channels (BGRA) for transparency
        four_channel_frames = []
        for f in processed_frames:
            if f.shape[2] == 3:
                f = cv2.cvtColor(f, cv2.COLOR_BGR2BGRA)
            four_channel_frames.append(f)

        if not four_channel_frames:
             return {"error": "No valid frames to process after channel conversion"}

        # Combine frames into a sprite sheet
        max_height = max(f.shape[0] for f in four_channel_frames)
        total_width = sum(f.shape[1] for f in four_channel_frames)

        # Create a new transparent canvas for the sprite sheet
        sprite_sheet = np.zeros((max_height, total_width, 4), dtype=np.uint8)

        current_x = 0
        for frame in four_channel_frames:
            h, w, _ = frame.shape
            # Paste each frame into the sprite sheet
            sprite_sheet[0:h, current_x:current_x+w] = frame
            current_x += w

        # Encode the final sprite sheet to PNG bytes
        is_success, sprite_encoded = cv2.imencode('.png', sprite_sheet)
        if not is_success:
            return {"error": "Failed to encode sprite sheet"}

        sprite_bytes = sprite_encoded.tobytes()

        # Return the image as a streaming response
        return StreamingResponse(io.BytesIO(sprite_bytes), media_type="image/png", headers={"Content-Disposition": "attachment; filename=sprite.png"})

    finally:
        # Clean up the temporary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

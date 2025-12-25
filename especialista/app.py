from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from rembg import remove, new_session
import io

app = FastAPI()

# --- Model Session ---
# Create a session for the isnet-anime model, which is optimized for anime-style images.
# This session is created once at startup to save loading time on each request.
session = new_session("isnet-anime")

@app.post("/remove-background/")
async def remove_background_api(file: UploadFile = File(...)):
    """
    Endpoint to remove the background from an uploaded image.
    Accepts a single image file and returns the processed image with a transparent background.
    """
    # Validate that the uploaded file is an image.
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    # Read the image content into memory.
    contents = await file.read()

    # Use the rembg library to remove the background.
    # The processing is done in memory.
    try:
        output_bytes = remove(contents, session=session)
    except Exception as e:
        # If the background removal process fails, return a server error.
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

    # Return the processed image as a streaming response.
    # This is efficient for sending binary data like an image.
    return StreamingResponse(io.BytesIO(output_bytes), media_type="image/png")

@app.get("/")
def read_root():
    """
    Root endpoint that returns the status of the service.
    Useful for health checks.
    """
    return {"status": "Especialista Service is running"}

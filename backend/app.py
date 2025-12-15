
import torch
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from diffusers import TextToVideoZeroPipeline
from PIL import Image
import io
import os
import numpy as np
import imageio

# --- Configuración de la Aplicación FastAPI ---
app = FastAPI()

# Configura CORS para permitir peticiones desde cualquier origen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Carga del Modelo de IA ---
# Esta sección carga el modelo Zeroscope optimizado para CPU.
try:
    # IMPORTANTE: Especificamos "cpu" para asegurar que se ejecute en el hardware gratuito.
    device = "cpu"
    # El tipo de dato 'torch.float32' es el recomendado para CPU.
    dtype = torch.float32

    # Cargamos el pipeline del modelo Zeroscope v2 576w.
    # El modelo se descargará automáticamente la primera vez.
    pipe = TextToVideoZeroPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=dtype
    )

    # Movemos el pipeline al dispositivo CPU.
    pipe.to(device)

    print("Modelo Zeroscope v2 cargado exitosamente en CPU.")

except Exception as e:
    print(f"Error crítico al cargar el modelo: {e}")
    pipe = None

# --- Endpoints de la API ---

@app.get("/")
def read_root():
    """Endpoint raíz para verificar que el servidor está en funcionamiento."""
    return {"status": "Servidor de Animación (CPU) de VidSpri está funcionando"}

@app.post("/generate-video/")
async def generate_video(
    image: UploadFile = File(...),
    prompt: str = Form("un personaje corriendo felizmente"),
    frames: int = Form(25)
):
    """
    Endpoint principal para generar un video a partir de una imagen y un prompt usando CPU.
    """
    if pipe is None:
        raise HTTPException(status_code=503, detail="El modelo de IA no está disponible. Revisa los logs.")

    try:
        # 1. Cargar la imagen de entrada. El prompt ya viene como texto.
        input_bytes = await image.read()
        image_pil = Image.open(io.BytesIO(input_bytes)).convert("RGB")

        # 2. Generar el video usando el pipeline de Zeroscope.
        # Este modelo usa el prompt para guiar la animación de la imagen.
        result = pipe(prompt=prompt, image=image_pil, num_inference_steps=50, num_frames=frames)
        video_frames = result.frames

        # 3. Convertir los fotogramas (que están en formato PIL) a un video MP4 en memoria.
        np_frames = [np.array(frame) for frame in video_frames]
        video_buffer = io.BytesIO()

        # Calculamos los FPS para que el video dure ~2 segundos.
        fps = max(1, round(frames / 2))

        # Usamos imageio para escribir los fotogramas en el buffer como MP4.
        imageio.mimwrite(video_buffer, np_frames, format="mp4", fps=fps)
        video_buffer.seek(0)

        # 4. Devolver el video MP4.
        return StreamingResponse(video_buffer, media_type="video/mp4")

    except Exception as e:
        print(f"Error durante la generación de video: {e}")
        raise HTTPException(status_code=500, detail=f"Ocurrió un error al generar el video: {str(e)}")

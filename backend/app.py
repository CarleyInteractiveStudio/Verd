
import torch
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from diffusers import StableVideoDiffusionPipeline
from PIL import Image
import io
import os
import numpy as np
import imageio

# --- Configuración de la Aplicación FastAPI ---
app = FastAPI()

# Configura CORS para permitir peticiones desde cualquier origen (puedes restringirlo si es necesario)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Carga del Modelo de IA ---
# Esta sección carga el modelo de Stable Video Diffusion al iniciar el servidor.
# Usamos un bloque try-except para manejar posibles errores si el modelo no se puede cargar.
try:
    # Asegúrate de que el dispositivo sea 'cuda' para usar la GPU, que es esencial para este modelo.
    device = "cuda"
    # Carga el pipeline del modelo pre-entrenado desde Hugging Face.
    # El modelo se descargará automáticamente la primera vez que se ejecute.
    # torch.float16 es una optimización para usar menos memoria de la GPU.
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid-xt",
        torch_dtype=torch.float16,
        variant="fp16"
    )
    pipe.to(device)
    print("Modelo Stable Video Diffusion cargado exitosamente en la GPU.")
except Exception as e:
    print(f"Error crítico al cargar el modelo: {e}")
    # Si el modelo no se carga, el servidor no podrá funcionar.
    # En un entorno de producción, podrías querer manejar esto de forma más robusta.
    pipe = None

# --- Endpoints de la API ---

@app.get("/")
def read_root():
    """Endpoint raíz para verificar que el servidor está en funcionamiento."""
    return {"status": "Servidor de Animación de VidSpri está funcionando"}

@app.post("/generate-video/")
async def generate_video(
    image: UploadFile = File(...),
    prompt: str = Form("un personaje corriendo felizmente"), # Prompt por defecto
    frames: int = Form(25) # Número de fotogramas por defecto
):
    """
    Endpoint principal para generar un video a partir de una imagen y un prompt.
    """
    if pipe is None:
        raise HTTPException(status_code=503, detail="El modelo de IA no está disponible en este momento. Por favor, revisa los logs del servidor.")

    try:
        # 1. Cargar y preparar la imagen de entrada
        input_bytes = await image.read()
        image_pil = Image.open(io.BytesIO(input_bytes)).convert("RGB")

        # El modelo SVD requiere que las imágenes tengan un tamaño específico.
        # Redimensionamos la imagen si es necesario.
        image_pil = image_pil.resize((1024, 576))

        # 2. Generar el video usando el pipeline
        # `decode_chunk_size` es una optimización para modelos grandes.
        video_frames = pipe(image_pil, num_frames=frames, decode_chunk_size=8).frames[0]

        # 3. Convertir los fotogramas a un video MP4 en memoria
        # Convertimos las imágenes PIL a arrays de NumPy, que es el formato que necesita imageio.
        np_frames = [np.array(frame) for frame in video_frames]

        video_buffer = io.BytesIO()

        # Usamos imageio para escribir los fotogramas en el buffer como un video MP4.
        # Calculamos los FPS para asegurar que el video dure aproximadamente 2 segundos.
        # Por ejemplo, para 25 fotogramas, fps = 25 / 2 = 12.5
        # Usamos max(1, ...) para evitar un FPS de 0 si solo hay 1 fotograma.
        fps = max(1, round(frames / 2))
        imageio.mimwrite(video_buffer, np_frames, format="mp4", fps=fps)

        video_buffer.seek(0)

        # 4. Devolver el video MP4 como una respuesta de streaming
        return StreamingResponse(video_buffer, media_type="video/mp4")

    except Exception as e:
        print(f"Error durante la generación de video: {e}")
        raise HTTPException(status_code=500, detail=f"Ocurrió un error al generar el video: {str(e)}")

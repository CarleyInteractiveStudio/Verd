---
title: VidSpri Animation Backend (CPU)
emoji: 🎬
colorFrom: blue
colorTo: green
sdk: docker
sdk_version: 4.22.1
app_port: 8000
hardware: cpu-basic
python_version: 3.9
---

# VidSpri - Servidor de Animación (CPU)

Este es el backend para la generación de animaciones de VidSpri. Utiliza el pipeline **TextToVideoZeroPipeline** con el modelo base **runwayml/stable-diffusion-v1-5** para crear un video corto a partir de una imagen estática y una descripción de texto, optimizado para ejecutarse en CPU.

## Configuración del Space

- **SDK:** Docker
- **Hardware:** `cpu-basic` (CPU Básico) - Configurado para el plan gratuito de Hugging Face.
- **Puerto de la App:** 8000

## Endpoint de la API

- **URL:** `/generate-video/`
- **Método:** `POST`
- **Cuerpo (form-data):**
  - `image`: El archivo de imagen (PNG, JPG).
  - `prompt`: (Opcional) Una descripción de la animación deseada (string).
  - `frames`: (Opcional) El número de fotogramas a generar (integer).

El servidor devolverá un video en formato **MP4** como respuesta.

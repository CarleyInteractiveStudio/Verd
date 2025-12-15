---
title: VidSpri Animation Backend
emoji: 🎬
colorFrom: red
colorTo: yellow
sdk: docker
sdk_version: 4.22.1
app_port: 8000
hardware: gpu-a10g-small
python_version: 3.9
---

# VidSpri - Servidor de Animación

Este es el backend para la generación de animaciones de VidSpri. Utiliza el modelo **Stable Video Diffusion** para crear un video corto a partir de una imagen estática y una descripción de texto.

## Configuración del Space

- **SDK:** Docker
- **Hardware:** `gpu-a10g-small` (GPU A10G Small) - **Importante:** Se requiere una GPU para que el modelo funcione.
- **Puerto de la App:** 8000

## Endpoint de la API

- **URL:** `/generate-video/`
- **Método:** `POST`
- **Cuerpo (form-data):**
  - `image`: El archivo de imagen (PNG, JPG).
  - `prompt`: (Opcional) Una descripción de la animación deseada (string).
  - `frames`: (Opcional) El número de fotogramas a generar (integer).

El servidor devolverá un video en formato **MP4** como respuesta.

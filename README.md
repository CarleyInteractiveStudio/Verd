---
title: VidSpri - Video to Sprite
emoji: 🎞️
colorFrom: purple
colorTo: red
sdk: python
sdk_version: 3.9
app_file: app.py
---

# VidSpri - Video to Sprite Generator

This is the backend for the VidSpri application.

It's a FastAPI server that takes a video file and a number of frames, and returns a PNG sprite sheet with the backgrounds removed.

**Endpoint:** `/generate-sprite/`
**Method:** `POST`
**Form Data:**
- `video_file`: The video file to process.
- `frames`: The number of frames to extract.

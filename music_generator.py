import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration
import scipy.io.wavfile as wavfile
import io

# --- Model Loading ---
# Load the processor and model once when the module is imported
# This is more efficient than loading it on every request.
processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
# If you have a GPU, you can move the model to the GPU for faster inference
# device = "cuda:0" if torch.cuda.is_available() else "cpu"
# model.to(device)

def generate_audio(text: str, duration: int):
    """
    Generates audio from a text prompt using the MusicGen model.

    Args:
        text (str): The text prompt to generate audio from.
        duration (int): The duration of the audio to generate in seconds.

    Returns:
        io.BytesIO: A byte stream of the generated audio in WAV format.
    """
    try:
        inputs = processor(
            text=[text],
            padding=True,
            return_tensors="pt",
        )

        # Calculate max_new_tokens based on the model's sampling rate
        sampling_rate = model.config.audio_encoder.sampling_rate
        max_new_tokens = int(duration * sampling_rate / 1280) # Approximation, might need adjustment

        audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)

        # --- Convert to WAV format ---
        # The output is a raw audio waveform. We need to convert it to a standard format.
        sampling_rate = model.config.audio_encoder.sampling_rate
        audio_waveform = audio_values.cpu().numpy().squeeze()

        # Create an in-memory byte stream
        wav_buffer = io.BytesIO()
        wavfile.write(wav_buffer, rate=sampling_rate, data=audio_waveform)
        wav_buffer.seek(0)

        return wav_buffer

    except Exception as e:
        # It's good practice to handle potential errors during model inference
        print(f"Error during audio generation: {e}")
        return None

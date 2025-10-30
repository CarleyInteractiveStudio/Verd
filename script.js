document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const form = document.getElementById('sprite-form');
    const videoFileInput = document.getElementById('video-file');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const markStartBtn = document.getElementById('mark-start-btn');
    const markEndBtn = document.getElementById('mark-end-btn');
    const framesInput = document.getElementById('frames');
    const fullVideoCheckbox = document.getElementById('full-video-checkbox');
    const timeRangeInputs = document.getElementById('time-range-inputs');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');

    const extractFramesBtn = document.getElementById('extract-frames-btn');
    const framePreviewContainer = document.getElementById('frame-preview-container');
    const framesOutput = document.getElementById('frames-output');
    const generateSpriteBtn = document.getElementById('generate-sprite-btn');

    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    const progressBarInner = document.getElementById('progress-bar-inner');

    const resultContainer = document.getElementById('result-container');
    const spriteImage = document.getElementById('sprite-image');
    const downloadLink = document.getElementById('download-link');
    const errorMessage = document.getElementById('error-message');
    const errorMessageParagraph = errorMessage.querySelector('p');

    let extractedFrames = []; // To store the extracted frame blobs
    const backendUrl = 'https://carley1234-vidspri.hf.space/remove-background/';

    // --- Event Listeners ---

    // Show video previewer when a file is selected
    videoFileInput.addEventListener('change', () => {
        if (videoFileInput.files && videoFileInput.files[0]) {
            const videoURL = URL.createObjectURL(videoFileInput.files[0]);
            videoPreview.src = videoURL;
            videoPreviewContainer.classList.remove('hidden');
            framePreviewContainer.classList.add('hidden'); // Hide old previews
            resultContainer.classList.add('hidden'); // Hide old results
        } else {
            videoPreviewContainer.classList.add('hidden');
        }
    });

    // Mark Start Time button logic
    markStartBtn.addEventListener('click', () => {
        startTimeInput.value = videoPreview.currentTime.toFixed(2);
        fullVideoCheckbox.checked = false;
        timeRangeInputs.classList.remove('hidden');
    });

    // Mark End Time button logic
    markEndBtn.addEventListener('click', () => {
        endTimeInput.value = videoPreview.currentTime.toFixed(2);
        fullVideoCheckbox.checked = false;
        timeRangeInputs.classList.remove('hidden');
    });

    // Toggle visibility of time range inputs based on checkbox
    fullVideoCheckbox.addEventListener('change', () => {
        timeRangeInputs.classList.toggle('hidden', fullVideoCheckbox.checked);
    });

    // Main form submission is now a two-step process, so we prevent the default submit
    form.addEventListener('submit', (event) => event.preventDefault());

    // Step 1: Extract Frames locally
    extractFramesBtn.addEventListener('click', async () => {
        const videoFile = videoFileInput.files[0];
        if (!videoFile) {
            showError("Por favor, sube un archivo de video.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');
        progressText.textContent = "Extrayendo fotogramas del video...";
        updateProgressBar(0);

        const frameCount = parseInt(framesInput.value, 10);
        let startTime = 0;
        let endTime = videoPreview.duration;

        if (!fullVideoCheckbox.checked) {
            startTime = parseFloat(startTimeInput.value);
            endTime = parseFloat(endTimeInput.value);
        }

        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
            showError("El rango de tiempo seleccionado no es válido.");
            return;
        }

        try {
            extractedFrames = await extractFramesFromVideo(videoFile, frameCount, startTime, endTime);
            displayFramePreviews(extractedFrames);
            framePreviewContainer.classList.remove('hidden');
        } catch (error) {
            showError(`Error al extraer fotogramas: ${error.message}`);
        } finally {
            progressContainer.classList.add('hidden');
        }
    });

    // Step 2: Send frames to backend and generate sprite
    generateSpriteBtn.addEventListener('click', async () => {
        if (extractedFrames.length === 0) {
            showError("No hay fotogramas para procesar. Por favor, extráelos primero.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');

        let processedFrames = [];
        for (let i = 0; i < extractedFrames.length; i++) {
            progressText.textContent = `Procesando fotograma ${i + 1} de ${extractedFrames.length}...`;
            updateProgressBar(((i + 1) / extractedFrames.length) * 100);

            try {
                const formData = new FormData();
                formData.append('image', extractedFrames[i], `frame_${i}.png`);

                const response = await fetch(backendUrl, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: `Server error on frame ${i+1}` }));
                    throw new Error(errorData.detail);
                }

                const imageBlob = await response.blob();
                processedFrames.push(imageBlob);
            } catch (error) {
                showError(`Error en el fotograma ${i + 1}: ${error.message}`);
                progressContainer.classList.add('hidden');
                return;
            }
        }

        progressText.textContent = "Creando la hoja de sprites...";
        await createSpriteSheet(processedFrames);
        progressContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
    });

    // --- Helper Functions ---

    function hideAllSections() {
        errorMessage.classList.add('hidden');
        resultContainer.classList.add('hidden');
        framePreviewContainer.classList.add('hidden');
    }

    function showError(message) {
        errorMessageParagraph.textContent = `Lo sentimos, ha ocurrido un error: ${message}`;
        errorMessage.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }

    function updateProgressBar(percentage) {
        progressBarInner.style.width = `${percentage}%`;
    }

    function displayFramePreviews(frames) {
        framesOutput.innerHTML = ''; // Clear previous previews
        frames.forEach(frameBlob => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(frameBlob);
            framesOutput.appendChild(img);
        });
    }

    async function extractFramesFromVideo(videoFile, frameCount, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const frames = [];
            const duration = endTime - startTime;
            const interval = duration / frameCount;

            video.src = URL.createObjectURL(videoFile);
            video.muted = true;

            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                video.currentTime = startTime;
            });

            video.addEventListener('seeked', async () => {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob(blob => {
                    frames.push(blob);

                    if (frames.length < frameCount) {
                        const nextTime = video.currentTime + interval;
                        if(nextTime <= endTime) {
                            video.currentTime = nextTime;
                        } else {
                           // If we are over the end time, we are done
                           resolve(frames);
                        }
                    } else {
                        resolve(frames);
                    }
                }, 'image/png');
            });

            video.addEventListener('error', (e) => reject(new Error('Error al cargar el video.')));
            video.load();
        });
    }

    async function createSpriteSheet(frames) {
        const images = await Promise.all(frames.map(blob => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = URL.createObjectURL(blob);
            });
        }));

        if (images.length === 0) return;

        const maxHeight = Math.max(...images.map(img => img.height));
        const totalWidth = images.reduce((sum, img) => sum + img.width, 0);

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        const context = canvas.getContext('2d');

        let currentX = 0;
        images.forEach(img => {
            context.drawImage(img, currentX, 0);
            currentX += img.width;
        });

        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            spriteImage.src = url;
            downloadLink.href = url;
        }, 'image/png');
    }
});

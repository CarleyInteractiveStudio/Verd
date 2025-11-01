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
        updateProgressBar(50); // Simulated progress

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
            const frames = await extractFramesFromVideo(videoFile, frameCount, startTime, endTime);
            extractedFrames = frames.map((blob, index) => ({ id: index, blob })); // Give each frame a unique ID
            displayFramePreviews();
            framePreviewContainer.classList.remove('hidden');
        } catch (error) {
            showError(`Error al extraer fotogramas: ${error.message}`);
        } finally {
            progressContainer.classList.add('hidden');
        }
    });

    // Step 2: Create spritesheet, send to backend, and show result
    generateSpriteBtn.addEventListener('click', async () => {
        if (extractedFrames.length === 0) {
            showError("No hay fotogramas para procesar.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');
        progressText.textContent = "Uniendo fotogramas...";
        updateProgressBar(30);

        try {
            // Create a single spritesheet image from the remaining frames
            const spritesheetBlob = await createSpriteSheet(extractedFrames.map(f => f.blob), false);

            progressText.textContent = "Enviando al servidor para quitar el fondo...";
            updateProgressBar(60);

            const formData = new FormData();
            formData.append('image', spritesheetBlob, 'spritesheet.png');

            const response = await fetch(backendUrl, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Error del servidor.` }));
                throw new Error(errorData.detail);
            }

            const finalImageBlob = await response.blob();

            // Display the final result
            const finalUrl = URL.createObjectURL(finalImageBlob);
            spriteImage.src = finalUrl;
            downloadLink.href = finalUrl;
            resultContainer.classList.remove('hidden');

        } catch (error) {
            showError(error.message);
        } finally {
            progressContainer.classList.add('hidden');
        }
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

    function displayFramePreviews() {
        framesOutput.innerHTML = ''; // Clear previous previews
        extractedFrames.forEach(frameData => {
            const frameContainer = document.createElement('div');
            frameContainer.className = 'frame-container';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(frameData.blob);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = () => {
                extractedFrames = extractedFrames.filter(f => f.id !== frameData.id);
                frameContainer.remove();
            };

            frameContainer.appendChild(img);
            frameContainer.appendChild(deleteBtn);
            framesOutput.appendChild(frameContainer);
        });
    }

    async function extractFramesFromVideo(videoFile, frameCount, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const frames = [];
            const duration = endTime - startTime;
            const interval = duration / (frameCount > 1 ? frameCount -1 : 1);

            video.src = URL.createObjectURL(videoFile);
            video.muted = true;

            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                video.currentTime = startTime;
            });

            video.addEventListener('seeked', () => {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob(blob => {
                    frames.push(blob);

                    if (frames.length < frameCount) {
                        const nextTime = video.currentTime + interval;
                        video.currentTime = Math.min(nextTime, endTime);
                    } else {
                        resolve(frames);
                    }
                }, 'image/png');
            });

            video.addEventListener('error', (e) => reject(new Error('Error al cargar el video.')));
            video.load();
        });
    }

    async function createSpriteSheet(blobs, isFinal) {
         return new Promise(async (resolve) => {
            const images = await Promise.all(blobs.map(blob => {
                return new Promise(resolveImg => {
                    const img = new Image();
                    img.onload = () => resolveImg(img);
                    img.src = URL.createObjectURL(blob);
                });
            }));

            if (images.length === 0) {
                if (isFinal) {
                    spriteImage.src = '';
                    downloadLink.href = '';
                }
                return resolve(null);
            };

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

            if (isFinal) {
                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    spriteImage.src = url;
                    downloadLink.href = url;
                    resolve();
                }, 'image/png');
            } else {
                canvas.toBlob(blob => resolve(blob), 'image/png');
            }
        });
    }
});

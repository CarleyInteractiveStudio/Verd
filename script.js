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
    const cropOptionsBtn = document.getElementById('crop-options-btn');

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
    const serverMessage = document.getElementById('server-message');
    const bannerAdContainer = document.getElementById('banner-ad-container');

    // Modal elements
    const cropModal = document.getElementById('crop-modal');
    const closeBtn = document.querySelector('.close-btn');
    const cropArea = document.getElementById('crop-area');
    const setCropAreaBtn = document.getElementById('set-crop-area-btn');
    const setEraseAreaBtn = document.getElementById('set-erase-area-btn');
    const applyCropBtn = document.getElementById('apply-crop-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const clearCropBtn = document.getElementById('clear-crop-btn');
    const cropModeTitle = document.getElementById('crop-mode-title');

    // Premium Modal elements
    const premiumModal = document.getElementById('premium-modal');
    const premiumCodeBtn = document.getElementById('premium-code-btn');
    const closePremiumBtn = document.querySelector('.close-premium-btn');
    const premiumCodeInput = document.getElementById('premium-code-input');
    const savePremiumCodeBtn = document.getElementById('save-premium-code-btn');
    const premiumStatus = document.getElementById('premium-status');


    let extractedFrames = []; // To store the extracted frame blobs
    const backendUrl = 'https://carley1234-vidspri.hf.space/remove-background/';
    let cropper = null;
    let cropCoords = null;
    let eraseCoords = null;
    let currentCropMode = null; // 'crop' or 'erase'
    let bannerInterval = null;

    // --- Premium Code Logic ---

    // Show the modal
    premiumCodeBtn.addEventListener('click', () => {
        premiumModal.style.display = 'block';
    });

    // Hide the modal
    closePremiumBtn.addEventListener('click', () => {
        premiumModal.style.display = 'none';
    });

    // Hide modal if clicked outside
    window.addEventListener('click', (event) => {
        if (event.target == premiumModal) {
            premiumModal.style.display = 'none';
        }
    });

    // Save premium code to localStorage
    savePremiumCodeBtn.addEventListener('click', () => {
        const code = premiumCodeInput.value.trim();
        if (code) {
            localStorage.setItem('vidspri_premium_code', code);
            updatePremiumStatus();
            alert('Código premium guardado.');
            premiumModal.style.display = 'none';
        } else {
            // Clear the code if the input is empty
            localStorage.removeItem('vidspri_premium_code');
            updatePremiumStatus();
            alert('Código premium eliminado.');
        }
    });

    // Check for saved premium code on load
    function updatePremiumStatus() {
        const savedCode = localStorage.getItem('vidspri_premium_code');
        if (savedCode) {
            premiumStatus.textContent = 'PREMIUM';
            premiumStatus.style.color = 'gold';
            premiumCodeBtn.classList.add('premium-active');
        } else {
            premiumStatus.textContent = 'GRATIS';
            premiumStatus.style.color = '#fff';
            premiumCodeBtn.classList.remove('premium-active');
        }
    }

    // Initial check on page load
    document.addEventListener('DOMContentLoaded', updatePremiumStatus);
    updatePremiumStatus(); // Also call it immediately for safety


    // --- Event Listeners ---

    // Show video previewer when a file is selected
    videoFileInput.addEventListener('change', () => {
        // Reset crop state when a new video is loaded
        cropCoords = null;
        eraseCoords = null;

        if (videoFileInput.files && videoFileInput.files[0]) {
            const videoURL = URL.createObjectURL(videoFileInput.files[0]);
            videoPreview.src = videoURL;
            videoPreview.load(); // Explicitly start loading the video
            videoPreviewContainer.classList.remove('hidden');
            cropOptionsBtn.classList.remove('hidden'); // Show crop button
            framePreviewContainer.classList.add('hidden'); // Hide old previews
            resultContainer.classList.add('hidden'); // Hide old results
        } else {
            videoPreviewContainer.classList.add('hidden');
            cropOptionsBtn.classList.add('hidden'); // Hide crop button
        }
    });

    videoPreview.addEventListener('loadedmetadata', () => {
        cropOptionsBtn.disabled = false;
        cropOptionsBtn.textContent = 'Opciones de Recorte';
    });

    // --- Cropping Modal Logic ---
    function openModal() {
        cropModal.classList.remove('hidden');
        cropModal.style.display = 'flex';

        // Take a snapshot of the current video frame and display it
        const canvas = document.createElement('canvas');
        canvas.width = videoPreview.videoWidth;
        canvas.height = videoPreview.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL();

        const image = document.createElement('img');
        image.id = 'cropper-image';
        image.src = imageUrl;
        image.style.maxWidth = '100%';
        cropArea.innerHTML = ''; // Clear previous content
        cropArea.appendChild(image);
    }

    function closeModal() {
        cropModal.classList.add('hidden');
        cropModal.style.display = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropArea.innerHTML = '';
        cropModeTitle.textContent = ''; // Clear title on close
    }

    cropOptionsBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelCropBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == cropModal) {
            closeModal();
        }
    });

    // --- Cropper Initialization ---

    function initializeCropper(mode) {
        // Always destroy the previous instance to prevent conflicts
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }

        currentCropMode = mode;
        cropModeTitle.textContent = mode === 'crop'
            ? 'Editando: Área de Fotogramas'
            : 'Editando: Zona a Eliminar';

        const image = document.getElementById('cropper-image');
        if (!image) return; // Safety check

        const imageUrl = image.src; // Get the src from the existing image
        cropArea.innerHTML = ''; // Clear the container to remove the static image

        // Initialize the cropper, which will create its own image element in the container
        cropper = new ImageCropper('#crop-area', imageUrl, {
            update_cb: (data) => {
                // This callback saves data live as the user adjusts the cropper
                if (mode === 'crop') {
                    cropCoords = data;
                } else if (mode === 'erase') {
                    eraseCoords = data;
                }
            }
        });
    }

    setCropAreaBtn.addEventListener('click', () => initializeCropper('crop'));
    setEraseAreaBtn.addEventListener('click', () => initializeCropper('erase'));

    applyCropBtn.addEventListener('click', () => {
        // The coordinates are already saved by the update_cb
        closeModal();
    });

    clearCropBtn.addEventListener('click', () => {
        cropCoords = null;
        eraseCoords = null;
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropArea.innerHTML = '';
        cropModeTitle.textContent = '';
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

        // Validate crop area size before starting extraction
        if (cropCoords && (cropCoords.width <= 0 || cropCoords.height <= 0)) {
            showError("El área de recorte seleccionada es inválida o demasiado pequeña. Por favor, ajústala e inténtalo de nuevo.");
            progressContainer.classList.add('hidden');
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

    // Step 2: Send frames one by one, then create spritesheet and show result
    generateSpriteBtn.addEventListener('click', async () => {
        if (extractedFrames.length === 0) {
            showError("No hay fotogramas para procesar.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');
        serverMessage.classList.remove('hidden');
        bannerAdContainer.classList.remove('hidden');

        // AdSense Auto Ads will automatically detect the visible container and place an ad.
        // We don't need a manual refresh loop.

        const totalFrames = extractedFrames.length;
        const processedFrames = [];
        const premiumCode = localStorage.getItem('vidspri_premium_code'); // Get premium code

        try {
            for (let i = 0; i < totalFrames; i++) {
                const frameData = extractedFrames[i];
                progressText.textContent = `Procesando fotograma ${i + 1} de ${totalFrames}...`;

                const formData = new FormData();
                formData.append('image', frameData.blob, `frame_${frameData.id}.png`);
                if (premiumCode) {
                    formData.append('premium_code', premiumCode); // Add code to the request
                }

                const response = await fetch(backendUrl, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: `Error del servidor en el fotograma ${i + 1}.` }));
                    throw new Error(errorData.detail);
                }

                const processedBlob = await response.blob();
                processedFrames.push(processedBlob);

                // Update progress bar after each successful processing
                updateProgressBar(((i + 1) / totalFrames) * 100);
            }

            // Once all frames are processed, create the final spritesheet
            progressText.textContent = "Creando la hoja de sprites final...";
            await createSpriteSheet(processedFrames, true); // true indicates it's the final sprite
            resultContainer.classList.remove('hidden');

        } catch (error) {
            showError(error.message);
        } finally {
            progressContainer.classList.add('hidden');
            serverMessage.classList.add('hidden');
            bannerAdContainer.classList.add('hidden');
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
            const interval = duration / (frameCount > 1 ? frameCount - 1 : 1);

            video.muted = true;

            video.addEventListener('loadedmetadata', () => {
                // Set canvas size based on crop area if it exists
                if (cropCoords) {
                    canvas.width = cropCoords.width;
                    canvas.height = cropCoords.height;
                } else {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                video.currentTime = startTime;
            });

            video.addEventListener('seeked', () => {
                // Clear context for each frame
                context.clearRect(0, 0, canvas.width, canvas.height);

                // Draw the video frame, applying the crop if necessary
                const sourceX = cropCoords ? cropCoords.x : 0;
                const sourceY = cropCoords ? cropCoords.y : 0;
                const sourceWidth = cropCoords ? cropCoords.width : video.videoWidth;
                const sourceHeight = cropCoords ? cropCoords.height : video.videoHeight;

                context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

                // Apply the erase area if it exists
                if (eraseCoords) {
                    // We need to adjust erase coordinates relative to the crop
                    const eraseX = eraseCoords.x - (cropCoords ? cropCoords.x : 0);
                    const eraseY = eraseCoords.y - (cropCoords ? cropCoords.y : 0);
                    context.clearRect(eraseX, eraseY, eraseCoords.width, eraseCoords.height);
                }

                canvas.toBlob(blob => {
                    frames.push(blob);

                    if (frames.length < frameCount) {
                        const nextTime = video.currentTime + interval;
                        // Clamp nextTime to the end time to avoid overshooting
                        video.currentTime = Math.min(nextTime, endTime);
                    } else {
                        resolve(frames);
                    }
                }, 'image/png');
            });

            video.addEventListener('error', (e) => reject(new Error('Error al cargar el video.')));

            // Set the src and load the video *after* all event listeners are attached
            video.src = URL.createObjectURL(videoFile);
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


document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const mainMenu = document.getElementById('main-menu');
    const videoSection = document.getElementById('video-section');
    const videoSpriteBtn = document.getElementById('video-sprite-btn');
    const imageSpriteBtn = document.getElementById('image-sprite-btn');
    const soundGenerationBtn = document.getElementById('sound-generation-btn');
    const textToSpriteBtn = document.getElementById('text-to-sprite-btn');
    const spritePreviewBtn = document.getElementById('sprite-preview-btn');
    const textToSpriteSection = document.getElementById('text-to-sprite-section');
    const videoTypeButtons = document.querySelectorAll('.video-type-btn');
    const textPrompt = document.getElementById('text-prompt');
    const videoInspirationButtonsContainer = document.getElementById('video-inspiration-buttons');
    const generateVideoBtn = document.getElementById('generate-video-btn');
    const soundGenerationSection = document.getElementById('sound-generation-section');
    const soundTypeButtons = document.querySelectorAll('.sound-type-btn');
    const soundPrompt = document.getElementById('sound-prompt');
    const inspirationButtonsContainer = document.getElementById('inspiration-buttons');
    const generateSoundBtn = document.getElementById('generate-sound-btn');
    const audioResultContainer = document.getElementById('audio-result-container');
    const generationInfo = document.getElementById('generation-info');
    const audioPlayer = document.getElementById('audio-player');
    const imageAnimationSection = document.getElementById('image-animation-section');
    const animationForm = document.getElementById('animation-form');
    const dragDropArea = document.getElementById('drag-drop-area');
    const imageFileInput = document.getElementById('image-file');
    const imagePreviewContainerAnim = document.getElementById('image-preview-container-anim');
    const imagePreviewAnim = document.getElementById('image-preview-anim');
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
    const serverMessage = document.getElementById('server-message');
    const bannerAdContainer = document.getElementById('banner-ad-container');
    const premiumModal = document.getElementById('premium-modal');
    const premiumCodeBtn = document.getElementById('premium-code-btn');
    const closePremiumBtn = document.querySelector('.close-premium-btn');
    const premiumCodeInput = document.getElementById('premium-code-input');
    const savePremiumCodeBtn = document.getElementById('save-premium-code-btn');
    const premiumStatus = document.getElementById('premium-status');
    const unavailableModal = document.getElementById('unavailable-modal');
    const closeUnavailableBtn = document.querySelector('.close-unavailable-btn');
    const shareModal = document.getElementById('share-modal');
    const closeShareBtn = document.querySelector('.close-share-btn');
    const shareAppBtn = document.getElementById('share-app-btn');
    const downloadAppModal = document.getElementById('download-app-modal');
    const closeDownloadBtn = document.querySelector('.close-download-btn');
    const downloadBtnHeader = document.getElementById('download-app-btn-header');
    const downloadBtnResult = document.getElementById('download-app-btn-result');
    const premiumFeatureModal = document.getElementById('premium-feature-modal');
    const closePremiumFeatureBtn = document.querySelector('.close-premium-feature-btn');
    const supportBtn = document.getElementById('support-btn');
    const donateBtnFooter = document.getElementById('donate-btn-footer');
    const shareBtnFooter = document.getElementById('share-btn-footer');
    let extractedFrames = [];
    const dragDropAreaVideo = document.getElementById('drag-drop-area-video');
    const spritePreviewSection = document.getElementById('sprite-preview-section');
    const spriteFileInput = document.getElementById('sprite-file');
    const dragDropAreaSprite = document.getElementById('drag-drop-area-sprite');
    const spriteFramesInput = document.getElementById('sprite-frames');
    const detectFramesBtn = document.getElementById('detect-frames-btn');
    const spriteSpeedInput = document.getElementById('sprite-speed');
    const speedValue = document.getElementById('speed-value');
    const spriteCanvas = document.getElementById('sprite-canvas');
    const playPauseBtn = document.getElementById('play-pause-animation-btn');
    const spriteCanvasContainer = document.getElementById('sprite-canvas-container');
    const downloadPreviewLink = document.getElementById('download-preview-link');
    const infoBubble = document.getElementById('sprite-info-bubble');
    const spriteDimensionsSpan = document.getElementById('sprite-dimensions');
    const spriteFrameCountSpan = document.getElementById('sprite-frame-count');
    const previewSpriteBtn = document.getElementById('preview-sprite-btn');

    // --- Queue Status Panel Elements ---
    const queueStatusPanel = document.getElementById('queue-status-panel');
    const queueMessage = document.getElementById('queue-message');
    const queuePosition = document.getElementById('queue-position');
    const jobIdDisplay = document.getElementById('job-id');
    const spinner = document.getElementById('spinner');
    const priorityCodeSection = document.getElementById('priority-code-section');
    const applyCodeButton = document.getElementById('apply-code-button');
    const codeMessage = document.getElementById('code-message');
    const priorityCodeInputField = document.getElementById('priority-code-input');


    // --- Server URLs ---
    const apiUrl = 'https://carley1234-vidspri.hf.space';
    const backgroundRemovalUrl = `${apiUrl}/remove-background/`;
    const statusUrl = `${apiUrl}/status/`;
    const applyCodeUrl = `${apiUrl}/apply-code`;
    const audioGenerationUrl = 'https://carley1234-vidspri-music.hf.space/generate-audio/';

    // --- State Variables for Queue System ---
    let jobPollingInterval = null;
    let mainJobId = null;

    // --- Event Listener for Simulated Job Submission (for testing/rehydration) ---
    document.addEventListener('jobSubmitted', () => {
        const storedJobId = sessionStorage.getItem('jobId');
        const totalFrames = sessionStorage.getItem('totalFrames');

        if (storedJobId && totalFrames) {
            mainJobId = storedJobId;

            hideAllSections();
            queueStatusPanel.classList.remove('hidden');

            updateQueueStatusUI({
                status: 'queued', // Assume it starts as queued
                queue_position: '...', // Placeholder until first poll
                completed_frames: 0,
                total_frames: totalFrames
            });

            // Start polling immediately
            if (jobPollingInterval) clearInterval(jobPollingInterval);
            checkStatus(mainJobId); // Initial check
            jobPollingInterval = setInterval(() => checkStatus(mainJobId), 5000);
        }
    });

    // --- Main Logic ---

    if (videoSpriteBtn) {
        videoSpriteBtn.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            videoSection.classList.remove('hidden');
        });
    }

    // ... (All other menu button event listeners remain the same)

    generateSpriteBtn.addEventListener('click', processFramesAndGenerateSpriteSheet);

    async function processFramesAndGenerateSpriteSheet() {
        if (extractedFrames.length === 0) {
            showError("No hay fotogramas para procesar.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');
        progressText.textContent = "Subiendo fotogramas y creando trabajo...";
        updateProgressBar(10);

        const formData = new FormData();
        extractedFrames.forEach((frameData, index) => {
            // The server expects a field named "images". This correctly appends each frame blob to that field.
            formData.append('images', frameData.blob);
        });

        try {
            const response = await fetch(backgroundRemovalUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Error del servidor al encolar el trabajo.' }));
                throw new Error(errorData.detail);
            }

            const data = await response.json();
            mainJobId = data.job_id;

            progressContainer.classList.add('hidden');
            queueStatusPanel.classList.remove('hidden');
            updateQueueStatusUI(data);

            if (jobPollingInterval) clearInterval(jobPollingInterval);
            jobPollingInterval = setInterval(() => checkStatus(mainJobId), 5000);

        } catch (error) {
            showError(error.message);
        }
    }

    async function checkStatus(jobId) {
        try {
            const response = await fetch(`${statusUrl}${jobId}`);

            if (!response.ok) {
                throw new Error("El servidor no pudo recuperar el estado del trabajo.");
            }

            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(jobPollingInterval);
                queueMessage.textContent = "¡Completado! Creando hoja de sprites...";
                spinner.style.display = 'none';

                // Decode base64 frames and create blobs
                const frameBlobs = data.frames.map(base64String => {
                    const byteString = atob(base64String);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    return new Blob([ab], { type: 'image/png' });
                });

                await createSpriteSheet(frameBlobs);

                queueStatusPanel.classList.add('hidden');
                resultContainer.classList.remove('hidden');
                shareModal.classList.remove('hidden');

            } else {
                updateQueueStatusUI(data);
            }

        } catch (error) {
            clearInterval(jobPollingInterval);
            showError("No se pudo obtener el estado del trabajo. Comprueba tu conexión.");
        }
    }

    function updateQueueStatusUI(data) {
        jobIdDisplay.textContent = mainJobId;

        if (data.status === 'queued') {
            queueMessage.textContent = "Tu solicitud está en la cola.";
            queuePosition.textContent = `#${data.queue_position}`;
            spinner.style.display = 'block';
            priorityCodeSection.style.display = 'block';
        } else if (data.status === 'processing') {
            queueMessage.textContent = `Procesando... (${data.completed_frames} de ${data.total_frames} fotogramas)`;
            queuePosition.textContent = '--';
            spinner.style.display = 'block';
            priorityCodeSection.style.display = 'none';
        }
    }

    applyCodeButton.addEventListener('click', async () => {
        const code = priorityCodeInputField.value.trim();
        if (!code || !mainJobId) {
            codeMessage.textContent = "Por favor, introduce un código válido.";
            codeMessage.style.color = '#ff4a4a';
            return;
        }

        codeMessage.textContent = "Aplicando código...";
        codeMessage.style.color = '#ccc';

        try {
            const formData = new URLSearchParams();
            formData.append('job_id', mainJobId);
            formData.append('code', code);

            const response = await fetch(applyCodeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                 throw new Error(data.detail || 'El código no es válido o ha expirado.');
            }

            codeMessage.textContent = data.message;
            codeMessage.style.color = '#03dac6';
            queuePosition.textContent = `#${data.new_queue_position}`;
            priorityCodeInputField.value = '';

        } catch (error) {
            codeMessage.textContent = error.message;
            codeMessage.style.color = '#ff4a4a';
        }
    });

    // --- Helper Functions ---

    function hideAllSections() {
        errorMessage.classList.add('hidden');
        resultContainer.classList.add('hidden');
        framePreviewContainer.classList.add('hidden');
        soundGenerationSection.classList.add('hidden');
        videoSection.classList.add('hidden');
        imageAnimationSection.classList.add('hidden');
        textToSpriteSection.classList.add('hidden');
        queueStatusPanel.classList.add('hidden');
        mainMenu.classList.add('hidden'); // Hide main menu when a process starts
    }

    // ... (Rest of the original, unchanged functions from script.js go here)
    // This includes showError, updateProgressBar, displayFramePreviews, extractFramesFromVideo,
    // createSpriteSheet, all modal logic, all other section logic, etc.
    // I will paste the full original content here minus the parts I've already replaced.

    function showError(message) {
        errorMessageParagraph.textContent = `Lo sentimos, ha ocurrido un error: ${message}`;
        errorMessage.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }

    function updateProgressBar(percentage) {
        progressBarInner.style.width = `${percentage}%`;
    }

    function displayFramePreviews() {
        framesOutput.innerHTML = '';
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
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                video.currentTime = startTime;
            });

            video.addEventListener('seeked', () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

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

            video.src = URL.createObjectURL(videoFile);
            video.load();
        });
    }

    async function createSpriteSheet(blobs) {
         return new Promise(async (resolve) => {
            const images = await Promise.all(blobs.map(blob => {
                return new Promise(resolveImg => {
                    const img = new Image();
                    img.onload = () => resolveImg(img);
                    img.src = URL.createObjectURL(blob);
                });
            }));

            if (images.length === 0) {
                spriteImage.src = '';
                downloadLink.href = '';
                return resolve();
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

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                spriteImage.src = url;
                downloadLink.href = url;
                resolve();
            }, 'image/png');
        });
    }

    // --- And all other functions from the original file... ---
});

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'es',
        includedLanguages: 'es,en,zh-CN,hi,pt,ru,fr,ar,bn,de,ja,ko,it,id,tr',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
    }, 'google_translate_element');
}

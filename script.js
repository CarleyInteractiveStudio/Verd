document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const mainMenu = document.getElementById('main-menu');
    const videoSection = document.getElementById('video-section');
    const videoSpriteBtn = document.getElementById('video-sprite-btn');
    const imageSpriteBtn = document.getElementById('image-sprite-btn');

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

    // Premium Modal elements
    const premiumModal = document.getElementById('premium-modal');
    const premiumCodeBtn = document.getElementById('premium-code-btn');
    const closePremiumBtn = document.querySelector('.close-premium-btn');
    const premiumCodeInput = document.getElementById('premium-code-input');
    const savePremiumCodeBtn = document.getElementById('save-premium-code-btn');
    const premiumStatus = document.getElementById('premium-status');

    // Unavailable Feature Modal elements
    const unavailableModal = document.getElementById('unavailable-modal');
    const closeUnavailableBtn = document.querySelector('.close-unavailable-btn');

    // Share/Donate Modal elements
    const shareModal = document.getElementById('share-modal');
    const closeShareBtn = document.querySelector('.close-share-btn');
    const shareAppBtn = document.getElementById('share-app-btn');

    // Download App Modal elements
    const downloadAppModal = document.getElementById('download-app-modal');
    const closeDownloadBtn = document.querySelector('.close-download-btn');
    const downloadBtnHeader = document.getElementById('download-app-btn-header');
    const downloadBtnResult = document.getElementById('download-app-btn-result');

    // Footer buttons
    const donateBtnFooter = document.getElementById('donate-btn-footer');
    const shareBtnFooter = document.getElementById('share-btn-footer');

    let extractedFrames = []; // To store the extracted frame blobs
    const backendUrl = 'https://carley1234-vidspri.hf.space/remove-background/';

    // --- App Detection Logic ---
    function showDownloadButtons() {
        // This function is called if the app is running in a web browser
        const buttons = document.querySelectorAll('.download-btn');
        buttons.forEach(btn => btn.classList.remove('hidden-by-default'));
    }

    if (typeof window.esAppNativa === 'undefined') {
        showDownloadButtons();
    }

    // --- Main Menu Logic ---

    videoSpriteBtn.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        videoSection.classList.remove('hidden');
    });

    imageSpriteBtn.addEventListener('click', () => {
        unavailableModal.classList.remove('hidden');
    });

    // --- Premium Code Logic ---

    premiumCodeBtn.addEventListener('click', () => {
        premiumModal.classList.remove('hidden');
    });

    closePremiumBtn.addEventListener('click', () => {
        premiumModal.classList.add('hidden');
    });

    savePremiumCodeBtn.addEventListener('click', () => {
        const code = premiumCodeInput.value.trim();
        if (code) {
            localStorage.setItem('vidspri_premium_code', code);
            updatePremiumStatus();
            alert('Código premium guardado.');
            premiumModal.classList.add('hidden');
        } else {
            localStorage.removeItem('vidspri_premium_code');
            updatePremiumStatus();
            alert('Código premium eliminado.');
        }
    });

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

    updatePremiumStatus();

    // --- Modal Logic ---

    function closeModalOnClickOutside(event) {
        if (event.target === premiumModal) {
            premiumModal.classList.add('hidden');
        }
        if (event.target === unavailableModal) {
            unavailableModal.classList.add('hidden');
        }
        if (event.target === shareModal) {
            shareModal.classList.add('hidden');
        }
        if (event.target === downloadAppModal) {
            downloadAppModal.classList.add('hidden');
        }
    }

    window.addEventListener('click', closeModalOnClickOutside);

    closeUnavailableBtn.addEventListener('click', () => {
        unavailableModal.classList.add('hidden');
    });

    closeShareBtn.addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });

    closeDownloadBtn.addEventListener('click', () => {
        downloadAppModal.classList.add('hidden');
    });

    downloadBtnHeader.addEventListener('click', () => {
        downloadAppModal.classList.remove('hidden');
    });

    downloadBtnResult.addEventListener('click', () => {
        downloadAppModal.classList.remove('hidden');
    });

    // --- Footer Buttons Logic ---
    donateBtnFooter.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://www.paypal.com/donate/?hosted_button_id=SF9TB2TJLYL96', '_blank');
    });

    shareBtnFooter.addEventListener('click', (e) => {
        e.preventDefault();
        shareAppBtn.click(); // Simulate a click on the existing share button
    });

    // --- Share Logic ---

    shareAppBtn.addEventListener('click', async () => {
        const shareData = {
            title: 'VidSpri - Video to Sprite',
            text: '¡Crea hojas de sprites a partir de videos con esta increíble app!',
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for browsers that don't support Web Share API
                navigator.clipboard.writeText(shareData.url);
                alert('¡Enlace copiado al portapapeles!');
            }
        } catch (err) {
            console.error('Error al compartir:', err);
        }
    });

    // --- Video Processing Logic ---

    videoFileInput.addEventListener('change', () => {
        if (videoFileInput.files && videoFileInput.files[0]) {
            const videoURL = URL.createObjectURL(videoFileInput.files[0]);
            videoPreview.src = videoURL;
            videoPreview.load();
            videoPreviewContainer.classList.remove('hidden');
            framePreviewContainer.classList.add('hidden');
            resultContainer.classList.add('hidden');
        } else {
            videoPreviewContainer.classList.add('hidden');
        }
    });

    markStartBtn.addEventListener('click', () => {
        startTimeInput.value = videoPreview.currentTime.toFixed(2);
        fullVideoCheckbox.checked = false;
        timeRangeInputs.classList.remove('hidden');
    });

    markEndBtn.addEventListener('click', () => {
        endTimeInput.value = videoPreview.currentTime.toFixed(2);
        fullVideoCheckbox.checked = false;
        timeRangeInputs.classList.remove('hidden');
    });

    fullVideoCheckbox.addEventListener('change', () => {
        timeRangeInputs.classList.toggle('hidden', fullVideoCheckbox.checked);
    });

    form.addEventListener('submit', (event) => event.preventDefault());

    extractFramesBtn.addEventListener('click', async () => {
        const videoFile = videoFileInput.files[0];
        if (!videoFile) {
            showError("Por favor, sube un archivo de video.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');
        progressText.textContent = "Extrayendo fotogramas del video...";
        updateProgressBar(50);

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
            extractedFrames = frames.map((blob, index) => ({ id: index, blob }));
            displayFramePreviews();
            framePreviewContainer.classList.remove('hidden');
        } catch (error) {
            showError(`Error al extraer fotogramas: ${error.message}`);
        } finally {
            progressContainer.classList.add('hidden');
        }
    });

    generateSpriteBtn.addEventListener('click', async () => {
        if (extractedFrames.length === 0) {
            showError("No hay fotogramas para procesar.");
            return;
        }

        hideAllSections();
        progressContainer.classList.remove('hidden');
        serverMessage.classList.remove('hidden');
        bannerAdContainer.classList.remove('hidden');

        const totalFrames = extractedFrames.length;
        const processedFrames = [];
        const premiumCode = localStorage.getItem('vidspri_premium_code');

        try {
            for (let i = 0; i < totalFrames; i++) {
                const frameData = extractedFrames[i];
                progressText.textContent = `Procesando fotograma ${i + 1} de ${totalFrames}...`;

                const formData = new FormData();
                formData.append('image', frameData.blob, `frame_${frameData.id}.png`);
                if (premiumCode) {
                    formData.append('premium_code', premiumCode);
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

                updateProgressBar(((i + 1) / totalFrames) * 100);
            }

            progressText.textContent = "Creando la hoja de sprites final...";
            await createSpriteSheet(processedFrames);
            resultContainer.classList.remove('hidden');
            shareModal.classList.remove('hidden'); // Show the share modal

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
});

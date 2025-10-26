document.addEventListener('DOMContentLoaded', () => {
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
    const resultContainer = document.getElementById('result-container');
    const spriteImage = document.getElementById('sprite-image');
    const downloadLink = document.getElementById('download-link');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const errorMessageParagraph = errorMessage.querySelector('p');

    // Show video previewer when a file is selected
    videoFileInput.addEventListener('change', () => {
        if (videoFileInput.files && videoFileInput.files[0]) {
            const videoURL = URL.createObjectURL(videoFileInput.files[0]);
            videoPreview.src = videoURL;
            videoPreviewContainer.classList.remove('hidden');
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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Hide previous results and errors
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');

        const formData = new FormData();
        formData.append('video_file', videoFileInput.files[0]);
        formData.append('frames', framesInput.value);

        // Append time range data if not using the full video
        if (!fullVideoCheckbox.checked) {
            formData.append('start_time', startTimeInput.value);
            formData.append('end_time', endTimeInput.value);
        }

        try {
            const response = await fetch('/generate-sprite/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Server responded with status: ${response.status}` }));
                throw new Error(errorData.detail || `An unknown error occurred.`);
            }

            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            spriteImage.src = imageUrl;
            downloadLink.href = imageUrl;

            // Show the result
            resultContainer.classList.remove('hidden');

        } catch (error) {
            console.error('Error generating sprite:', error);
            errorMessageParagraph.textContent = `Lo sentimos, ha ocurrido un error: ${error.message}`;
            errorMessage.classList.remove('hidden');
        } finally {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
        }
    });
});

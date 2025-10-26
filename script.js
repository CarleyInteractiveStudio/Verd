document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sprite-form');
    const videoFileInput = document.getElementById('video-file');
    const framesInput = document.getElementById('frames');
    const resultContainer = document.getElementById('result-container');
    const spriteImage = document.getElementById('sprite-image');
    const downloadLink = document.getElementById('download-link');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');

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

        try {
            // The backend is on the same server in this setup
            const response = await fetch('/generate-sprite/', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);

            spriteImage.src = imageUrl;
            downloadLink.href = imageUrl;

            // Show the result
            resultContainer.classList.remove('hidden');

        } catch (error) {
            console.error('Error generating sprite:', error);
            errorMessage.classList.remove('hidden');
        } finally {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
        }
    });
});

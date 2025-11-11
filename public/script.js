// DOM elements
const form = document.getElementById('videoForm');
const imageUrlInput = document.getElementById('first_frame_image');
const imageFileInput = document.getElementById('imageFile');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreview = document.getElementById('imagePreview');
const promptInput = document.getElementById('prompt');
const charCount = document.getElementById('charCount');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const resultSection = document.getElementById('resultSection');
const taskIdElement = document.getElementById('taskId');
const taskStatusElement = document.getElementById('taskStatus');
const checkStatusBtn = document.getElementById('checkStatusBtn');
const videoResult = document.getElementById('videoResult');
const errorMessage = document.getElementById('errorMessage');

let currentTaskId = null;
let statusCheckInterval = null;

// Character count for prompt
promptInput.addEventListener('input', () => {
    charCount.textContent = promptInput.value.length;
});

// Image upload handler
uploadBtn.addEventListener('click', () => {
    imageFileInput.click();
});

imageFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload a JPG, PNG, or WebP image.');
        return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
        showError('Image size must be less than 20MB.');
        return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target.result;
        imageUrlInput.value = base64;
        showImagePreview(base64);
    };
    reader.readAsDataURL(file);
});

// Image URL input handler
imageUrlInput.addEventListener('input', () => {
    const url = imageUrlInput.value.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'))) {
        showImagePreview(url);
    } else {
        hideImagePreview();
    }
});

function showImagePreview(src) {
    imagePreview.innerHTML = `<img src="${src}" alt="Preview">`;
    imagePreview.style.display = 'block';
}

function hideImagePreview() {
    imagePreview.style.display = 'none';
    imagePreview.innerHTML = '';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function setLoading(loading) {
    submitBtn.disabled = loading;
    submitText.style.display = loading ? 'none' : 'inline';
    submitSpinner.style.display = loading ? 'inline-block' : 'none';
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);
    errorMessage.style.display = 'none';

    const formData = {
        model: document.getElementById('model').value,
        first_frame_image: imageUrlInput.value.trim(),
        prompt: promptInput.value.trim() || undefined,
        prompt_optimizer: document.getElementById('prompt_optimizer').checked,
        duration: parseInt(document.getElementById('duration').value),
        resolution: document.getElementById('resolution').value
    };

    try {
        const response = await fetch('/api/video-generation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create video generation task');
        }

        if (data.base_resp.status_code !== 0) {
            throw new Error(data.base_resp.status_msg || 'Request failed');
        }

        // Success - show task info
        currentTaskId = data.task_id;
        taskIdElement.textContent = currentTaskId;
        taskStatusElement.textContent = 'processing';
        taskStatusElement.className = '';
        resultSection.style.display = 'block';
        videoResult.innerHTML = '';
        
        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Start checking status automatically
        startStatusCheck();

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
});

// Check status button
checkStatusBtn.addEventListener('click', () => {
    if (currentTaskId) {
        checkTaskStatus();
    }
});

function startStatusCheck() {
    // Check immediately
    checkTaskStatus();

    // Then check every 10 seconds
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    statusCheckInterval = setInterval(() => {
        checkTaskStatus();
    }, 10000);
}

async function checkTaskStatus() {
    if (!currentTaskId) return;

    try {
        const response = await fetch(`/api/video-generation/${currentTaskId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to check task status');
        }

        if (data.base_resp.status_code !== 0) {
            throw new Error(data.base_resp.status_msg || 'Request failed');
        }

        // Handle status - Minimax returns "Success", "Processing", "Fail", "Preparing", "Queueing" (capitalized)
        // Our code normalizes to lowercase
        const status = (data.status || '').toLowerCase();
        const statusDisplay = data.status || status; // Show original capitalized version
        taskStatusElement.textContent = statusDisplay;

        // Update status styling
        taskStatusElement.className = '';
        if (status === 'success') {
            taskStatusElement.classList.add('status-success');
            
            // Show video if available - check multiple possible field names
            const videoUrl = data.file_url || data.download_url || data.url || data.video_url;
            if (videoUrl) {
                const dimensions = data.video_width && data.video_height 
                    ? ` (${data.video_width}x${data.video_height})` 
                    : '';
                videoResult.innerHTML = `
                    <h3>Generated Video${dimensions}</h3>
                    <video controls autoplay style="width: 100%; max-width: 800px; border-radius: 8px; box-shadow: var(--shadow);">
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <p style="margin-top: 10px;">
                        <a href="${videoUrl}" target="_blank" style="color: var(--primary-blue); text-decoration: none; font-weight: 600;">
                            Download Video
                        </a>
                    </p>
                `;
            } else if (data.file_id) {
                // Fetch video URL from file_id and display it
                fetchVideoUrl(data.file_id, data.video_width, data.video_height);
            }

            // Stop checking status
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
            }
        } else if (status === 'fail' || status === 'failed') {
            taskStatusElement.classList.add('status-error');
            videoResult.innerHTML = '<p style="color: var(--error-color);">Video generation failed. Please try again.</p>';
            
            // Stop checking status
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;
            }
        } else {
            // Still processing (Preparing, Queueing, Processing)
            taskStatusElement.className = '';
        }

    } catch (error) {
        console.error('Error checking status:', error);
        showError('Failed to check task status: ' + error.message);
    }
}

// Function to fetch video URL from file_id and display it
async function fetchVideoUrl(fileId, width, height) {
    try {
        videoResult.innerHTML = `
            <h3>Loading Video...</h3>
            <p>Fetching video URL...</p>
        `;

        const response = await fetch(`/api/video-file/${fileId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch video URL');
        }

        // According to Minimax API docs, download_url is nested in data.file.download_url
        // Try nested path first, then direct fields
        const videoUrl = (data.file && data.file.download_url) || data.download_url || data.url || data.file_url || data.video_url;
        
        if (videoUrl) {
            const dimensions = width && height ? ` (${width}x${height})` : '';
            videoResult.innerHTML = `
                <h3>Generated Video${dimensions}</h3>
                <video controls autoplay style="width: 100%; max-width: 800px; border-radius: 8px; box-shadow: var(--shadow);">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <p style="margin-top: 10px;">
                    <a href="${videoUrl}" target="_blank" style="color: var(--primary-blue); text-decoration: none; font-weight: 600;">
                        Download Video
                    </a>
                </p>
            `;
        } else {
            // Log what we received for debugging
            console.log('Video file response:', data);
            const dimensions = width && height ? ` (${width}x${height})` : '';
            videoResult.innerHTML = `
                <h3>Video Generated Successfully!${dimensions}</h3>
                <p><strong>File ID:</strong> ${fileId}</p>
                <p style="color: var(--text-gray);">Video URL not available in API response.</p>
                <p style="margin-top: 10px;">
                    <a href="https://platform.minimax.io" target="_blank" style="color: var(--primary-blue); text-decoration: none;">
                        Check Minimax Dashboard
                    </a>
                </p>
            `;
        }
    } catch (error) {
        console.error('Error fetching video URL:', error);
        const dimensions = width && height ? ` (${width}x${height})` : '';
        videoResult.innerHTML = `
            <h3>Video Generated Successfully!${dimensions}</h3>
            <p><strong>File ID:</strong> ${fileId}</p>
            <p style="color: var(--text-gray);">Unable to load video. <a href="https://platform.minimax.io" target="_blank" style="color: var(--primary-blue);">Check Minimax dashboard</a> to download.</p>
        `;
    }
}


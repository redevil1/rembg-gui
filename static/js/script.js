// Global variables
let originalImageData = null;
let processedImageData = null;
let backgroundImageData = null;
let cropState = {
    canvas: null,
    ctx: null,
    img: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    scale: 1
};

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const originalImage = document.getElementById('originalImage');
const processedImage = document.getElementById('processedImage');
const finalImage = document.getElementById('finalImage');
const finalResult = document.getElementById('finalResult');
const errorMessage = document.getElementById('errorMessage');

// Crop modal elements
const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const cropBtn = document.getElementById('cropBtn');
const closeCropBtn = document.getElementById('closeCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const resetCropBtn = document.getElementById('resetCropBtn');

// Color picker elements
const colorPicker = document.getElementById('colorPicker');
const colorValue = document.getElementById('colorValue');
const applyColorBtn = document.getElementById('applyColorBtn');
const colorPresets = document.querySelectorAll('.color-preset');

// Background image elements
const backgroundFileInput = document.getElementById('backgroundFileInput');
const bgImagePreview = document.getElementById('bgImagePreview');
const bgPreviewImage = document.getElementById('bgPreviewImage');
const applyImageBtn = document.getElementById('applyImageBtn');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Action buttons
const newImageBtn = document.getElementById('newImageBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadTransparentBtn = document.getElementById('downloadTransparentBtn');
const processingMessage = document.getElementById('processingMessage');

// Initialize app
function init() {
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // File upload
    fileInput.addEventListener('change', handleFileSelect);
    uploadBox.addEventListener('click', () => fileInput.click());
    
    // Drag and drop
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);
    
    // Color picker
    colorPicker.addEventListener('input', updateColorValue);
    applyColorBtn.addEventListener('click', applyColorBackground);
    
    // Color presets
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            colorPicker.value = color;
            updateColorValue();
        });
    });
    
    // Background image
    backgroundFileInput.addEventListener('change', handleBackgroundImageSelect);
    applyImageBtn.addEventListener('click', applyImageBackground);
    
    // Tabs
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Action buttons
    newImageBtn.addEventListener('click', resetApp);
    downloadBtn.addEventListener('click', downloadFinalImage);
    downloadTransparentBtn.addEventListener('click', downloadTransparentImage);
    
    // Crop buttons
    cropBtn.addEventListener('click', openCropModal);
    closeCropBtn.addEventListener('click', closeCropModal);
    cancelCropBtn.addEventListener('click', closeCropModal);
    applyCropBtn.addEventListener('click', applyCrop);
    resetCropBtn.addEventListener('click', resetCropSelection);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processImage(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    uploadBox.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    uploadBox.classList.remove('drag-over');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    uploadBox.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
}

// Process image
async function processImage(file) {
    try {
        // Show processing section
        showSection('processing', 'Removing background...');
        
        // Read and store original image
        const reader = new FileReader();
        reader.onload = async (e) => {
            originalImageData = e.target.result;
            originalImage.src = originalImageData;
            
            // Send to backend for background removal
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/remove-background', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove background');
            }
            
            const data = await response.json();
            
            if (data.success) {
                processedImageData = data.image;
                processedImage.src = processedImageData;
                showSection('result');
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        };
        
        reader.readAsDataURL(file);
    } catch (error) {
        showError(error.message);
    }
}

// Handle background image selection
function handleBackgroundImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            backgroundImageData = e.target.result;
            bgPreviewImage.src = backgroundImageData;
            bgImagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Apply color background
async function applyColorBackground() {
    try {
        const color = colorPicker.value;
        
        showSection('processing', 'Adding background...');
        
        const response = await fetch('/api/add-background', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                foreground: processedImageData,
                backgroundColor: color
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add background');
        }
        
        const data = await response.json();
        
        if (data.success) {
            finalImage.src = data.image;
            finalResult.classList.remove('hidden');
            showSection('result');
            
            // Scroll to final result
            finalResult.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        showError(error.message);
    }
}

// Apply image background
async function applyImageBackground() {
    try {
        if (!backgroundImageData) {
            showError('Please select a background image first');
            return;
        }
        
        showSection('processing', 'Adding background...');
        
        const response = await fetch('/api/add-background', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                foreground: processedImageData,
                backgroundImage: backgroundImageData
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add background');
        }
        
        const data = await response.json();
        
        if (data.success) {
            finalImage.src = data.image;
            finalResult.classList.remove('hidden');
            showSection('result');
            
            // Scroll to final result
            finalResult.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        showError(error.message);
    }
}

// Update color value display
function updateColorValue() {
    colorValue.textContent = colorPicker.value;
}

// Switch tabs
function switchTab(tabName) {
    // Update buttons
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update content
    document.getElementById('colorTab').classList.remove('active');
    document.getElementById('imageTab').classList.remove('active');
    
    if (tabName === 'color') {
        document.getElementById('colorTab').classList.add('active');
    } else {
        document.getElementById('imageTab').classList.add('active');
    }
}

// Show specific section
function showSection(section, message = '') {
    uploadSection.classList.add('hidden');
    processingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    
    switch (section) {
        case 'upload':
            uploadSection.classList.remove('hidden');
            break;
        case 'processing':
            if (message) {
                processingMessage.textContent = message;
            }
            processingSection.classList.remove('hidden');
            break;
        case 'result':
            resultSection.classList.remove('hidden');
            break;
        case 'error':
            errorSection.classList.remove('hidden');
            break;
    }
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    showSection('error');
}

// Reset app
function resetApp() {
    originalImageData = null;
    processedImageData = null;
    backgroundImageData = null;
    fileInput.value = '';
    backgroundFileInput.value = '';
    finalResult.classList.add('hidden');
    bgImagePreview.classList.add('hidden');
    showSection('upload');
}

// Download final image
function downloadFinalImage() {
    if (!finalImage.src) {
        showError('No final image to download. Please apply a background first.');
        return;
    }
    
    const link = document.createElement('a');
    link.href = finalImage.src;
    link.download = 'final-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download transparent image
function downloadTransparentImage() {
    if (!processedImageData) {
        showError('No processed image to download. Please upload and process an image first.');
        return;
    }
    
    const link = document.createElement('a');
    link.href = processedImageData;
    link.download = 'transparent-background.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Open crop modal
function openCropModal() {
    if (!processedImageData) {
        showError('No image to crop. Please upload and process an image first.');
        return;
    }
    
    cropModal.classList.remove('hidden');
    
    // Load image
    const img = new Image();
    img.onload = function() {
        cropState.img = img;
        cropState.canvas = cropCanvas;
        cropState.ctx = cropCanvas.getContext('2d');
        
        // Calculate scale to fit modal
        const maxWidth = 800;
        const maxHeight = 500;
        let scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        
        cropState.scale = scale;
        cropCanvas.width = img.width * scale;
        cropCanvas.height = img.height * scale;
        
        // Initialize with full image selection
        cropState.startX = 0;
        cropState.startY = 0;
        cropState.endX = cropCanvas.width;
        cropState.endY = cropCanvas.height;
        
        // Draw initial state
        drawCropCanvas();
        
        // Add event listeners for cropping
        cropCanvas.addEventListener('mousedown', startCrop);
        cropCanvas.addEventListener('mousemove', updateCrop);
        cropCanvas.addEventListener('mouseup', endCrop);
    };
    img.src = processedImageData;
}

// Start crop selection
function startCrop(e) {
    const rect = cropCanvas.getBoundingClientRect();
    cropState.startX = e.clientX - rect.left;
    cropState.startY = e.clientY - rect.top;
    cropState.isDragging = true;
}

// Update crop selection
function updateCrop(e) {
    if (!cropState.isDragging) return;
    
    const rect = cropCanvas.getBoundingClientRect();
    cropState.endX = e.clientX - rect.left;
    cropState.endY = e.clientY - rect.top;
    
    drawCropCanvas();
}

// End crop selection
function endCrop(e) {
    cropState.isDragging = false;
}

// Reset crop selection
function resetCropSelection() {
    if (!cropState.canvas) return;
    
    cropState.startX = 0;
    cropState.startY = 0;
    cropState.endX = cropState.canvas.width;
    cropState.endY = cropState.canvas.height;
    
    drawCropCanvas();
}

// Draw crop canvas with selection
function drawCropCanvas() {
    const ctx = cropState.ctx;
    const img = cropState.img;
    const canvas = cropState.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Calculate normalized selection rectangle
    const x = Math.min(cropState.startX, cropState.endX);
    const y = Math.min(cropState.startY, cropState.endY);
    const width = Math.abs(cropState.endX - cropState.startX);
    const height = Math.abs(cropState.endY - cropState.startY);
    
    // Draw darkened overlay outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, y);  // Top
    ctx.fillRect(0, y, x, height);  // Left
    ctx.fillRect(x + width, y, canvas.width - (x + width), height);  // Right
    ctx.fillRect(0, y + height, canvas.width, canvas.height - (y + height));  // Bottom
    
    // Draw selection border
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
}

// Close crop modal
function closeCropModal() {
    cropModal.classList.add('hidden');
    
    // Clean up event listeners
    if (cropCanvas) {
        cropCanvas.removeEventListener('mousedown', startCrop);
        cropCanvas.removeEventListener('mousemove', updateCrop);
        cropCanvas.removeEventListener('mouseup', endCrop);
    }
    
    // Reset crop state
    cropState = {
        canvas: null,
        ctx: null,
        img: null,
        isDragging: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        scale: 1
    };
}

// Apply crop
async function applyCrop() {
    if (!cropState.canvas || !cropState.img) {
        showError('Crop not initialized');
        return;
    }
    
    try {
        showSection('processing', 'Cropping image...');
        closeCropModal();
        
        // Calculate actual crop coordinates (scale back to original size)
        const x = Math.min(cropState.startX, cropState.endX) / cropState.scale;
        const y = Math.min(cropState.startY, cropState.endY) / cropState.scale;
        const width = Math.abs(cropState.endX - cropState.startX) / cropState.scale;
        const height = Math.abs(cropState.endY - cropState.startY) / cropState.scale;
        
        // Validate crop dimensions
        if (width < 10 || height < 10) {
            showError('Crop area is too small. Please select a larger area.');
            return;
        }
        
        // Create a new canvas for the cropped image
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        // Draw the cropped portion
        croppedCtx.drawImage(
            cropState.img,
            x, y, width, height,
            0, 0, width, height
        );
        
        // Convert to base64
        const croppedImageData = croppedCanvas.toDataURL('image/png');
        
        // Update the processed image with cropped version
        processedImageData = croppedImageData;
        processedImage.src = processedImageData;
        
        // Hide final result if it was shown, as we've modified the image
        finalResult.classList.add('hidden');
        
        showSection('result');
    } catch (error) {
        showError('Failed to crop image: ' + error.message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

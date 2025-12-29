// Global variables
let originalImageData = null;
let processedImageData = null;
let backgroundImageData = null;

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
        showSection('processing');
        
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
        
        showSection('processing');
        
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
        
        showSection('processing');
        
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
function showSection(section) {
    uploadSection.classList.add('hidden');
    processingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    
    switch (section) {
        case 'upload':
            uploadSection.classList.remove('hidden');
            break;
        case 'processing':
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

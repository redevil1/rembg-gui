from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io
import base64
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Ensure upload and output directories exist
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')

@app.route('/api/remove-background', methods=['POST'])
def remove_background():
    """Remove background from uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Read the image
        input_image = file.read()
        
        # Remove background
        output_image = remove(input_image)
        
        # Convert to base64 for sending back to client
        output_base64 = base64.b64encode(output_image).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{output_base64}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add-background', methods=['POST'])
def add_background():
    """Add a new background (image or color) to the processed image"""
    try:
        data = request.get_json()
        
        if 'foreground' not in data:
            return jsonify({'error': 'No foreground image provided'}), 400
        
        # Decode the foreground image (image with transparent background)
        foreground_data = data['foreground'].split(',')[1]
        foreground_bytes = base64.b64decode(foreground_data)
        foreground = Image.open(io.BytesIO(foreground_bytes)).convert('RGBA')
        
        # Check if we're adding a color or image background
        if 'backgroundColor' in data and data['backgroundColor']:
            # Create solid color background
            bg_color = data['backgroundColor']
            # Convert hex to RGB
            bg_color = bg_color.lstrip('#')
            rgb = tuple(int(bg_color[i:i+2], 16) for i in (0, 2, 4))
            
            background = Image.new('RGBA', foreground.size, rgb + (255,))
        
        elif 'backgroundImage' in data and data['backgroundImage']:
            # Use provided image as background
            bg_data = data['backgroundImage'].split(',')[1]
            bg_bytes = base64.b64decode(bg_data)
            background = Image.open(io.BytesIO(bg_bytes)).convert('RGBA')
            
            # Resize background to match foreground
            background = background.resize(foreground.size, Image.Resampling.LANCZOS)
        
        else:
            return jsonify({'error': 'No background color or image provided'}), 400
        
        # Composite the images
        result = Image.alpha_composite(background, foreground)
        
        # Convert to RGB for JPEG output
        result_rgb = result.convert('RGB')
        
        # Convert to base64
        buffered = io.BytesIO()
        result_rgb.save(buffered, format='PNG')
        result_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{result_base64}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from rembg import remove
from PIL import Image
import io
import base64
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Configuration
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit

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
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB'}), 400
        
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
        
        # Validate and decode the foreground image (image with transparent background)
        if ',' not in data['foreground']:
            return jsonify({'error': 'Invalid foreground image format'}), 400
            
        foreground_data = data['foreground'].split(',', 1)[1]
        foreground_bytes = base64.b64decode(foreground_data)
        foreground = Image.open(io.BytesIO(foreground_bytes)).convert('RGBA')
        
        # Check if we're adding a color or image background
        if 'backgroundColor' in data and data['backgroundColor']:
            # Create solid color background
            bg_color = data['backgroundColor']
            
            # Validate hex color format
            if not bg_color.startswith('#') or len(bg_color) not in [4, 7]:
                return jsonify({'error': 'Invalid color format. Use #RGB or #RRGGBB'}), 400
            
            # Convert hex to RGB
            bg_color = bg_color.lstrip('#')
            
            # Handle both 3-digit and 6-digit hex colors
            if len(bg_color) == 3:
                bg_color = ''.join([c*2 for c in bg_color])
            
            try:
                rgb = tuple(int(bg_color[i:i+2], 16) for i in (0, 2, 4))
            except ValueError:
                return jsonify({'error': 'Invalid hex color value'}), 400
            
            background = Image.new('RGBA', foreground.size, rgb + (255,))
        
        elif 'backgroundImage' in data and data['backgroundImage']:
            # Use provided image as background
            if ',' not in data['backgroundImage']:
                return jsonify({'error': 'Invalid background image format'}), 400
                
            bg_data = data['backgroundImage'].split(',', 1)[1]
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
    # WARNING: Debug mode is enabled for development convenience.
    # For production deployments, set debug=False to prevent security risks.
    # You can also use environment variables: FLASK_ENV=production
    # Or use a production WSGI server like gunicorn: gunicorn app:app
    app.run(debug=True, port=5000)

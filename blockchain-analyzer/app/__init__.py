from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Import the blueprint
    from app.routes import bp
    
    # Custom JSON encoder for NumPy types
    from app.routes import NumpyJSONEncoder
    app.json_encoder = NumpyJSONEncoder
    
    # Register the blueprint
    app.register_blueprint(bp, url_prefix="/api")
    
    @app.route('/')
    def index():
        return "Blockchain Analyzer API"
    
    return app

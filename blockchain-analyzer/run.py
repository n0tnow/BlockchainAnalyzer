from app import create_app
from dotenv import load_dotenv
import os

load_dotenv()

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    
    print(f"Starting server on {host}:{port} (debug={debug})")
    print(f"Elliptic dataset directory: {os.path.join(os.path.dirname(os.path.abspath(__file__)), 'elliptic_bitcoin_dataset')}")
    
    app.run(host=host, port=port, debug=debug)

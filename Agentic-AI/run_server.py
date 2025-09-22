#!/usr/bin/env python3
"""Simple script to run the Orthopedic Assistant MCP Server with web interface."""

import subprocess
import sys
import os
from pathlib import Path

def main():
    """Run the server with proper configuration."""
    
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Check if frontend files exist
    if not Path("frontend/index.html").exists():
        print("❌ Error: Frontend files not found")
        print("Please ensure frontend/index.html exists")
        print("Frontend structure should be:")
        print("  frontend/")
        print("    ├── index.html")
        print("    ├── style.css")
        print("    └── script.js")
        return 1
    
    print("✅ Found frontend files in frontend/ directory")
    
    # Check if YOLO model files exist
    model_files = [
        Path("models/hand_yolo.pt"),
        Path("models/leg_yolo.pt")
    ]
    
    missing_models = []
    for model_file in model_files:
        if model_file.exists():
            size_mb = model_file.stat().st_size / (1024 * 1024)
            print(f"✅ Found {model_file.name} ({size_mb:.1f} MB)")
        else:
            missing_models.append(str(model_file))
    
    if missing_models:
        print("❌ Error: YOLO model files not found:")
        for model in missing_models:
            print(f"   Missing: {model}")
        print("\nPlease ensure the following model files exist:")
        print("  models/")
        print("    ├── hand_yolo.pt")
        print("    └── leg_yolo.pt")
        return 1
    
    # Check if .env exists
    if not Path(".env").exists():
        print("⚠️  Warning: .env file not found")
        print("Creating default .env file...")
        
        env_content = """# Orthopedic Assistant MCP Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true
GROQ_API_KEY=your_groq_api_key_here
STORAGE_TYPE=local
STORAGE_PATH=./storage
MEDICAL_DISCLAIMER_ENABLED=true
PHI_REDACTION_ENABLED=true
METRICS_ENABLED=true
AUDIT_LOGGING_ENABLED=true
"""
        with open(".env", "w") as f:
            f.write(env_content)
        print("✅ Created default .env file")
    
    print("🚀 Starting Orthopedic Assistant MCP Server...")
    print("📱 Web interface will be available at: http://localhost:8000")
    print("📚 API documentation at: http://localhost:8000/docs")
    print("🔧 Press Ctrl+C to stop the server")
    print()
    print("🆕 REAL YOLO MODELS:")
    print("   🧠 Hand fracture detection: models/hand_yolo.pt")
    print("   🦵 Leg fracture detection: models/leg_yolo.pt")
    print("   ⚡ Models preloaded on server startup")
    print("   🎯 Real-time fracture detection with confidence scores")
    print("   🖼️  Annotated images with detection overlays")
    print("-" * 60)
    
    try:
        # Run the FastAPI server
        cmd = [
            sys.executable, "-m", "uvicorn", 
            "api.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ]
        
        subprocess.run(cmd, check=True)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running server: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
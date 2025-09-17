#!/usr/bin/env python3
"""
Create Lambda layer with psycopg2 and other dependencies
"""

import os
import subprocess
import zipfile
import shutil

def create_lambda_layer():
    """Create a Lambda layer with psycopg2 and dependencies"""
    
    print("🚀 Creating Lambda layer with psycopg2...")
    
    # Create layer directory
    layer_dir = "lambda-layer"
    python_dir = os.path.join(layer_dir, "python")
    
    # Clean up if exists
    if os.path.exists(layer_dir):
        shutil.rmtree(layer_dir)
    
    os.makedirs(python_dir, exist_ok=True)
    
    # Install psycopg2-binary and other dependencies
    print("📦 Installing psycopg2-binary...")
    try:
        subprocess.run([
            "pip", "install", 
            "psycopg2-binary", 
            "sqlalchemy", 
            "pydantic", 
            "fastapi", 
            "uvicorn", 
            "mangum",
            "python-jose[cryptography]",
            "passlib[bcrypt]",
            "python-multipart",
            "pydantic-settings",
            "python-dotenv",
            "-t", python_dir
        ], check=True)
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False
    
    # Create layer zip
    print("📦 Creating layer zip...")
    with zipfile.ZipFile("psycopg2-layer.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(layer_dir):
            for file in files:
                if file.endswith('.pyc') or file.startswith('__pycache__'):
                    continue
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, layer_dir)
                zipf.write(file_path, arc_path)
    
    print("✅ Lambda layer created: psycopg2-layer.zip")
    
    # Clean up
    shutil.rmtree(layer_dir)
    print("✅ Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    success = create_lambda_layer()
    if success:
        print("🎉 Lambda layer created successfully!")
    else:
        print("❌ Failed to create Lambda layer")

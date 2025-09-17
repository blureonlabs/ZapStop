#!/usr/bin/env python3
"""
Create Lambda layer with complete database dependencies
"""

import os
import subprocess
import zipfile
import shutil

def create_lambda_layer():
    """Create Lambda layer with complete database dependencies"""
    
    # Create layer directory
    layer_dir = "lambda-complete-db-layer"
    if os.path.exists(layer_dir):
        shutil.rmtree(layer_dir)
    os.makedirs(layer_dir)
    
    # Create python directory
    python_dir = os.path.join(layer_dir, "python")
    os.makedirs(python_dir)
    
    print("Installing pg8000 with all dependencies...")
    subprocess.run([
        "pip", "install", "pg8000", 
        "-t", python_dir
    ], check=True)
    
    print("Installing bcrypt...")
    subprocess.run([
        "pip", "install", "bcrypt", 
        "-t", python_dir
    ], check=True)
    
    # Create zip file
    zip_path = "lambda-complete-db-layer.zip"
    if os.path.exists(zip_path):
        os.remove(zip_path)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(layer_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, layer_dir)
                zipf.write(file_path, arc_path)
    
    print(f"Created Lambda layer: {zip_path}")
    print(f"Layer size: {os.path.getsize(zip_path) / (1024*1024):.2f} MB")
    
    # Clean up
    shutil.rmtree(layer_dir)
    
    return zip_path

if __name__ == "__main__":
    create_lambda_layer()

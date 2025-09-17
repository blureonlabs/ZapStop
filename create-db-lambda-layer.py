#!/usr/bin/env python3
"""
Create Lambda layer with psycopg2-binary and bcrypt for database connectivity
"""

import os
import subprocess
import zipfile
import shutil

def create_lambda_layer():
    """Create Lambda layer with database dependencies"""
    
    # Create layer directory
    layer_dir = "lambda-db-layer"
    if os.path.exists(layer_dir):
        shutil.rmtree(layer_dir)
    os.makedirs(layer_dir)
    
    # Create python directory
    python_dir = os.path.join(layer_dir, "python")
    os.makedirs(python_dir)
    
    print("Installing psycopg2-binary...")
    subprocess.run([
        "pip", "install", "psycopg2-binary", 
        "-t", python_dir,
        "--no-deps"
    ], check=True)
    
    print("Installing bcrypt...")
    subprocess.run([
        "pip", "install", "bcrypt", 
        "-t", python_dir,
        "--no-deps"
    ], check=True)
    
    print("Installing cffi (bcrypt dependency)...")
    subprocess.run([
        "pip", "install", "cffi", 
        "-t", python_dir,
        "--no-deps"
    ], check=True)
    
    print("Installing pycparser (cffi dependency)...")
    subprocess.run([
        "pip", "install", "pycparser", 
        "-t", python_dir,
        "--no-deps"
    ], check=True)
    
    # Create zip file
    zip_path = "lambda-db-layer.zip"
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

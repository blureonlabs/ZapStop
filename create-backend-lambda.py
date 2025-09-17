#!/usr/bin/env python3
"""
Create Lambda deployment package for FastAPI backend
"""

import zipfile
import os
import subprocess
import sys
import shutil

def create_backend_lambda_package():
    """Create a Lambda deployment package for FastAPI backend"""
    
    print("🚀 Creating FastAPI Lambda deployment package...")
    
    # Create temporary directory
    os.makedirs("lambda-backend", exist_ok=True)
    
    # Copy the entire app directory
    print("📁 Copying FastAPI app...")
    if os.path.exists("backend/app"):
        shutil.copytree("backend/app", "lambda-backend/app")
    else:
        print("❌ Backend app directory not found!")
        return False
    
    # Create the Lambda handler
    print("📝 Creating Lambda handler...")
    lambda_handler = '''
import json
import os
from mangum import Mangum
from app.main import app

# Create the ASGI handler
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    """AWS Lambda handler for FastAPI app"""
    try:
        # Handle the request
        response = handler(event, context)
        return response
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
'''
    
    with open("lambda-backend/lambda_handler.py", "w") as f:
        f.write(lambda_handler)
    
    # Copy requirements.txt
    if os.path.exists("backend/requirements.txt"):
        shutil.copy("backend/requirements.txt", "lambda-backend/requirements.txt")
    else:
        print("❌ Requirements.txt not found!")
        return False
    
    # Install dependencies
    print("📦 Installing dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install", 
        "-r", "lambda-backend/requirements.txt", 
        "-t", "lambda-backend"
    ], check=True)
    
    # Install additional Lambda-specific dependencies
    print("📦 Installing Lambda-specific dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install", 
        "mangum", "psycopg2-binary", 
        "-t", "lambda-backend"
    ], check=True)
    
    print("✅ Dependencies installed")
    
    # Create deployment zip
    print("📦 Creating deployment zip...")
    with zipfile.ZipFile("backend-lambda-deployment.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-backend"):
            for file in files:
                if file.endswith('.pyc') or file.startswith('__pycache__'):
                    continue
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, "lambda-backend")
                zipf.write(file_path, arc_path)
    
    print("✅ Backend deployment package created: backend-lambda-deployment.zip")
    
    # Clean up
    shutil.rmtree("lambda-backend")
    print("✅ Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    success = create_backend_lambda_package()
    if success:
        print("🎉 Backend Lambda package created successfully!")
    else:
        print("❌ Failed to create backend Lambda package")
        sys.exit(1)

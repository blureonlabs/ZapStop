#!/usr/bin/env python3
"""
Create complete Lambda deployment package for full FastAPI backend
"""

import zipfile
import os
import shutil

def create_full_lambda_package():
    """Create a complete Lambda deployment package"""
    
    print("🚀 Creating complete FastAPI Lambda deployment package...")
    
    # Create temporary directory
    os.makedirs("lambda-full", exist_ok=True)
    
    # Copy the app directory
    print("📁 Copying FastAPI app...")
    if os.path.exists("backend/app"):
        shutil.copytree("backend/app", "lambda-full/app")
        print("✅ FastAPI app copied")
    else:
        print("❌ Backend app directory not found!")
        return False
    
    # Copy the lambda handler
    print("📝 Copying Lambda handler...")
    shutil.copy("lambda_handler_full.py", "lambda-full/lambda_handler.py")
    
    # Create deployment zip
    print("📦 Creating deployment zip...")
    with zipfile.ZipFile("full-fastapi-lambda.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-full"):
            for file in files:
                if file.endswith('.pyc') or file.startswith('__pycache__'):
                    continue
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, "lambda-full")
                zipf.write(file_path, arc_path)
    
    print("✅ Complete FastAPI Lambda deployment package created: full-fastapi-lambda.zip")
    
    # Clean up
    shutil.rmtree("lambda-full")
    print("✅ Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    success = create_full_lambda_package()
    if success:
        print("🎉 Complete FastAPI Lambda package created successfully!")
    else:
        print("❌ Failed to create complete FastAPI Lambda package")

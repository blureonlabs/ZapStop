#!/usr/bin/env python3
"""
Create complete Lambda deployment package for FastAPI backend
"""

import zipfile
import os
import shutil

def create_complete_lambda_package():
    """Create a complete Lambda deployment package"""
    
    print("🚀 Creating complete FastAPI Lambda deployment package...")
    
    # Create temporary directory
    os.makedirs("lambda-complete", exist_ok=True)
    
    # Copy the app directory
    print("📁 Copying FastAPI app...")
    if os.path.exists("backend/app"):
        shutil.copytree("backend/app", "lambda-complete/app")
        print("✅ FastAPI app copied")
    else:
        print("❌ Backend app directory not found!")
        return False
    
    # Copy the lambda handler
    print("📝 Copying Lambda handler...")
    shutil.copy("lambda_handler_complete.py", "lambda-complete/lambda_handler.py")
    
    # Create deployment zip
    print("📦 Creating deployment zip...")
    with zipfile.ZipFile("complete-fastapi-lambda.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-complete"):
            for file in files:
                if file.endswith('.pyc') or file.startswith('__pycache__'):
                    continue
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, "lambda-complete")
                zipf.write(file_path, arc_path)
    
    print("✅ Complete FastAPI Lambda deployment package created: complete-fastapi-lambda.zip")
    
    # Clean up
    shutil.rmtree("lambda-complete")
    print("✅ Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    success = create_complete_lambda_package()
    if success:
        print("🎉 Complete FastAPI Lambda package created successfully!")
    else:
        print("❌ Failed to create complete FastAPI Lambda package")

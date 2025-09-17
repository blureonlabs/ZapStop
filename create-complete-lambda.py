#!/usr/bin/env python3
"""
Create complete Lambda deployment package for FastAPI backend
"""

import zipfile
import os
import shutil
import subprocess
import sys

def create_complete_lambda_package():
    """Create a complete Lambda deployment package"""
    
    print("🚀 Creating complete FastAPI Lambda deployment package...")
    
    # Create temporary directory
    os.makedirs("lambda-complete", exist_ok=True)
    
    # Copy the app directory
    print("📁 Copying FastAPI app...")
    if os.path.exists("backend/app"):
        shutil.copytree("backend/app", "lambda-complete/app")
    else:
        print("❌ Backend app directory not found!")
        return False
    
    # Copy the lambda handler
    print("📝 Copying Lambda handler...")
    shutil.copy("lambda_handler_complete.py", "lambda-complete/lambda_handler.py")
    
    # Copy dependencies from the existing venv
    print("📦 Copying dependencies from existing venv...")
    venv_path = "backend/venv/lib/python3.13/site-packages"
    
    if os.path.exists(venv_path):
        # Copy all essential packages
        essential_packages = [
            'fastapi', 'uvicorn', 'sqlalchemy', 'psycopg2', 'pydantic', 
            'python_jose', 'passlib', 'python_multipart', 'pydantic_settings',
            'python_dotenv', 'mangum', 'starlette', 'anyio', 'click',
            'h11', 'httptools', 'pyyaml', 'uvloop', 'watchfiles', 'websockets',
            'bcrypt', 'cryptography', 'ecdsa', 'rsa', 'pyasn1', 'packaging',
            'idna', 'sniffio', 'typing_extensions', 'annotated_types',
            'email_validator', 'jose', 'multidict', 'yarl', 'aiofiles',
            'aiosqlite', 'aioredis', 'celery', 'redis', 'boto3'
        ]
        
        for package in essential_packages:
            src_path = os.path.join(venv_path, package)
            if os.path.exists(src_path):
                dst_path = os.path.join("lambda-complete", package)
                if os.path.isdir(src_path):
                    shutil.copytree(src_path, dst_path)
                else:
                    shutil.copy2(src_path, dst_path)
                print(f"✅ Copied {package}")
            else:
                print(f"⚠️  Package {package} not found")
    else:
        print("❌ Virtual environment not found!")
        return False
    
    # Create deployment zip
    print("📦 Creating deployment zip...")
    with zipfile.ZipFile("complete-lambda-deployment.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-complete"):
            for file in files:
                if file.endswith('.pyc') or file.startswith('__pycache__'):
                    continue
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, "lambda-complete")
                zipf.write(file_path, arc_path)
    
    print("✅ Complete Lambda deployment package created: complete-lambda-deployment.zip")
    
    # Clean up
    shutil.rmtree("lambda-complete")
    print("✅ Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    success = create_complete_lambda_package()
    if success:
        print("🎉 Complete Lambda package created successfully!")
    else:
        print("❌ Failed to create complete Lambda package")
        sys.exit(1)

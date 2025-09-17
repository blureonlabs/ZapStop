#!/usr/bin/env python3
"""
Create simple Lambda deployment package using existing venv
"""

import zipfile
import os
import shutil
import subprocess
import sys

def create_simple_lambda_package():
    """Create a simple Lambda deployment package"""
    
    print("🚀 Creating simple Lambda deployment package...")
    
    # Create temporary directory
    os.makedirs("lambda-simple", exist_ok=True)
    
    # Copy the app directory
    print("📁 Copying FastAPI app...")
    if os.path.exists("backend/app"):
        shutil.copytree("backend/app", "lambda-simple/app")
    else:
        print("❌ Backend app directory not found!")
        return False
    
    # Create a simple Lambda handler
    print("📝 Creating Lambda handler...")
    lambda_handler = '''
import json
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
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
            
except ImportError as e:
    def lambda_handler(event, context):
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Import error',
                'message': str(e)
            })
        }
'''
    
    with open("lambda-simple/lambda_handler.py", "w") as f:
        f.write(lambda_handler)
    
    # Copy dependencies from the existing venv
    print("📦 Copying dependencies from existing venv...")
    venv_path = "backend/venv/lib/python3.13/site-packages"
    
    if os.path.exists(venv_path):
        # Copy essential packages
        essential_packages = [
            'fastapi', 'uvicorn', 'sqlalchemy', 'psycopg2', 'pydantic', 
            'python_jose', 'passlib', 'python_multipart', 'pydantic_settings',
            'python_dotenv', 'mangum', 'starlette', 'anyio', 'click',
            'h11', 'httptools', 'pyyaml', 'uvloop', 'watchfiles', 'websockets',
            'bcrypt', 'cryptography', 'ecdsa', 'rsa', 'pyasn1', 'packaging',
            'idna', 'sniffio', 'typing_extensions', 'annotated_types'
        ]
        
        for package in essential_packages:
            src_path = os.path.join(venv_path, package)
            if os.path.exists(src_path):
                dst_path = os.path.join("lambda-simple", package)
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
    with zipfile.ZipFile("simple-lambda-deployment.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("lambda-simple"):
            for file in files:
                if file.endswith('.pyc') or file.startswith('__pycache__'):
                    continue
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, "lambda-simple")
                zipf.write(file_path, arc_path)
    
    print("✅ Simple Lambda deployment package created: simple-lambda-deployment.zip")
    
    # Clean up
    shutil.rmtree("lambda-simple")
    print("✅ Cleaned up temporary files")
    
    return True

if __name__ == "__main__":
    success = create_simple_lambda_package()
    if success:
        print("🎉 Simple Lambda package created successfully!")
    else:
        print("❌ Failed to create simple Lambda package")
        sys.exit(1)

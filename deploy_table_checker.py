#!/usr/bin/env python3
"""
Deploy table checker Lambda function
"""

import boto3
import zipfile
import os

def create_lambda_package():
    """Create Lambda deployment package"""
    print("📦 Creating Lambda package...")
    
    # Create package directory
    os.makedirs("table-checker-package", exist_ok=True)
    
    # Copy the Lambda function
    with open("lambda_table_checker.py", "r") as src:
        with open("table-checker-package/lambda_function.py", "w") as dst:
            dst.write(src.read())
    
    # Create requirements.txt
    with open("table-checker-package/requirements.txt", "w") as f:
        f.write("psycopg2-binary==2.9.9\n")
    
    # Install dependencies
    print("📥 Installing dependencies...")
    import subprocess
    subprocess.run([
        "pip", "install", "-r", "table-checker-package/requirements.txt", 
        "-t", "table-checker-package/"
    ], check=True)
    
    # Create zip file
    print("🗜️ Creating zip file...")
    with zipfile.ZipFile("table-checker-lambda.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("table-checker-package"):
            for file in files:
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, "table-checker-package")
                zipf.write(file_path, arc_path)
    
    print("✅ Package created: table-checker-lambda.zip")
    return "table-checker-lambda.zip"

def deploy_lambda():
    """Deploy Lambda function"""
    print("🚀 Deploying Lambda function...")
    
    # Create package
    package_path = create_lambda_package()
    
    # Initialize AWS clients
    lambda_client = boto3.client('lambda', region_name='me-central-1')
    iam_client = boto3.client('iam', region_name='me-central-1')
    
    try:
        # Create IAM role for Lambda
        role_name = 'zapstop-table-checker-role'
        try:
            role_response = iam_client.get_role(RoleName=role_name)
            role_arn = role_response['Role']['Arn']
            print(f"✅ Using existing role: {role_arn}")
        except iam_client.exceptions.NoSuchEntityException:
            print("🔧 Creating IAM role...")
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"Service": "lambda.amazonaws.com"},
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            role_response = iam_client.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Role for ZapStop table checker Lambda'
            )
            role_arn = role_response['Role']['Arn']
            
            # Attach VPC execution policy
            iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn='arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
            )
            
            print(f"✅ Created role: {role_arn}")
        
        # Read the zip file
        with open(package_path, 'rb') as f:
            zip_content = f.read()
        
        # Create or update Lambda function
        function_name = 'zapstop-table-checker'
        try:
            # Try to update existing function
            lambda_client.update_function_code(
                FunctionName=function_name,
                ZipFile=zip_content
            )
            print(f"✅ Updated Lambda function: {function_name}")
        except lambda_client.exceptions.ResourceNotFoundException:
            # Create new function
            lambda_client.create_function(
                FunctionName=function_name,
                Runtime='python3.11',
                Role=role_arn,
                Handler='lambda_function.lambda_handler',
                Code={'ZipFile': zip_content},
                Description='ZapStop database table checker',
                Timeout=30,
                MemorySize=512,
                VpcConfig={
                    'SubnetIds': ['subnet-12345678', 'subnet-87654321'],  # You'll need to update these
                    'SecurityGroupIds': ['sg-12345678']  # You'll need to update this
                }
            )
            print(f"✅ Created Lambda function: {function_name}")
        
        # Create API Gateway integration
        print("🌐 Setting up API Gateway...")
        # Note: You'll need to manually create API Gateway integration
        print("⚠️  Manual step required: Create API Gateway integration for /tables endpoint")
        
        print(f"✅ Deployment complete! Function: {function_name}")
        print("📋 Next steps:")
        print("1. Update VPC configuration with correct subnet and security group IDs")
        print("2. Create API Gateway integration for /tables endpoint")
        print("3. Test the /tables endpoint")
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")

if __name__ == "__main__":
    import json
    deploy_lambda()

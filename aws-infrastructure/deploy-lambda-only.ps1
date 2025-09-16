# Deploy Lambda Function Only (Simplified Approach)
# This script deploys just the Lambda function without complex infrastructure

Write-Host "🚀 Deploying ZapStop Lambda Function (Simplified)" -ForegroundColor Blue
Write-Host "=================================================" -ForegroundColor Blue
Write-Host ""

# Set AWS CLI path
$env:PATH += ";C:\Program Files\Amazon\AWSCLIV2"

# Create a simple Lambda deployment package
Write-Host "📦 Creating Lambda deployment package..." -ForegroundColor Yellow

# Create deployment directory
if (Test-Path "lambda-deployment") {
    Remove-Item -Recurse -Force "lambda-deployment"
}
New-Item -ItemType Directory -Name "lambda-deployment"

# Copy backend code
Copy-Item -Recurse "..\backend\*" "lambda-deployment\"

# Create requirements.txt for Lambda
$requirements = @"
fastapi==0.104.1
mangum==0.17.0
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
asyncpg==0.29.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic==2.5.0
pydantic-settings==2.1.0
boto3==1.34.0
botocore==1.34.0
python-dotenv==1.0.0
"@

$requirements | Out-File -FilePath "lambda-deployment\requirements.txt" -Encoding UTF8

# Create a simple Lambda handler
$lambdaHandler = @"
import json
import os
from mangum import Mangum
from app.main_lambda import app

# Create Mangum handler
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    return handler(event, context)
"@

$lambdaHandler | Out-File -FilePath "lambda-deployment\lambda_handler.py" -Encoding UTF8

# Create deployment zip
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
Set-Location "lambda-deployment"
Compress-Archive -Path "*" -DestinationPath "..\zapstop-lambda.zip" -Force
Set-Location ".."

# Deploy using AWS CLI
Write-Host "🚀 Deploying Lambda function..." -ForegroundColor Yellow

# Create Lambda function
try {
    $functionName = "zapstop-api-dev"
    
    # Check if function exists
    $existingFunction = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" lambda get-function --function-name $functionName --region me-central-1 2>$null
    
    if ($existingFunction) {
        Write-Host "📝 Updating existing Lambda function..." -ForegroundColor Yellow
        & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" lambda update-function-code --function-name $functionName --zip-file fileb://zapstop-lambda.zip --region me-central-1
    } else {
        Write-Host "🆕 Creating new Lambda function..." -ForegroundColor Yellow
        
        # Create IAM role for Lambda
        $rolePolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
"@
        
        $rolePolicy | Out-File -FilePath "lambda-role-policy.json" -Encoding UTF8
        
        # Create role
        & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" iam create-role --role-name zapstop-lambda-role --assume-role-policy-document file://lambda-role-policy.json --region me-central-1
        
        # Attach basic execution policy
        & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" iam attach-role-policy --role-name zapstop-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole --region me-central-1
        
        # Wait for role to be ready
        Start-Sleep -Seconds 10
        
        # Create Lambda function
        & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" lambda create-function --function-name $functionName --runtime python3.11 --role arn:aws:iam::617291204846:role/zapstop-lambda-role --handler lambda_handler.lambda_handler --zip-file fileb://zapstop-lambda.zip --region me-central-1 --timeout 30 --memory-size 1024
    }
    
    Write-Host "✅ Lambda function deployed successfully!" -ForegroundColor Green
    
    # Create API Gateway
    Write-Host "🌐 Creating API Gateway..." -ForegroundColor Yellow
    
    # Get Lambda function ARN
    $lambdaArn = (& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" lambda get-function --function-name $functionName --region me-central-1 --query 'Configuration.FunctionArn' --output text)
    
    Write-Host "Lambda ARN: $lambdaArn" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 Deployment completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Blue
    Write-Host "1. Create API Gateway manually in AWS Console" -ForegroundColor Yellow
    Write-Host "2. Connect it to your Lambda function" -ForegroundColor Yellow
    Write-Host "3. Test your function" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔗 Lambda Function: $functionName" -ForegroundColor Green
    Write-Host "📍 Region: me-central-1" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Check AWS Console for details" -ForegroundColor Yellow
}

# Cleanup
if (Test-Path "lambda-deployment") {
    Remove-Item -Recurse -Force "lambda-deployment"
}
if (Test-Path "zapstop-lambda.zip") {
    Remove-Item "zapstop-lambda.zip"
}
if (Test-Path "lambda-role-policy.json") {
    Remove-Item "lambda-role-policy.json"
}

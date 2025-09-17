#!/bin/bash

# 🚀 ZapStop Lambda Deployment Script
# Packages and deploys the FastAPI backend to AWS Lambda

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_NAME="zapstop-prod-api"
REGION="us-east-1"
LAMBDA_LAYER_NAME="zapstop-dependencies"

echo -e "${BLUE}🚀 Starting Lambda deployment...${NC}"

# Check if we're in the backend directory
if [ ! -f "app/main.py" ]; then
    echo -e "${RED}❌ Please run this script from the backend directory${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pip install -r requirements.txt

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
mkdir -p lambda-package
cp -r app lambda-package/
cp requirements.txt lambda-package/

# Install dependencies in package directory
cd lambda-package
pip install -r requirements.txt -t .

# Create lambda handler
echo -e "${YELLOW}📝 Creating Lambda handler...${NC}"
cat > lambda_handler.py << 'EOF'
import json
import asyncio
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
EOF

# Add mangum to requirements
echo "mangum" >> requirements.txt

# Install mangum
pip install mangum -t .

# Create deployment zip
echo -e "${YELLOW}📦 Creating deployment zip...${NC}"
zip -r ../lambda-deployment.zip . -x "*.pyc" "__pycache__/*" "*.git*"

cd ..

# Deploy to Lambda
echo -e "${YELLOW}🚀 Deploying to Lambda...${NC}"
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda-deployment.zip \
    --region $REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Lambda function updated successfully${NC}"
else
    echo -e "${RED}❌ Lambda deployment failed${NC}"
    exit 1
fi

# Clean up
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
rm -rf lambda-package
rm -f lambda-deployment.zip

# Test the deployment
echo -e "${YELLOW}🧪 Testing Lambda function...${NC}"
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --payload '{"httpMethod": "GET", "path": "/health"}' \
    response.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Lambda function test successful${NC}"
    echo -e "${BLUE}Response:${NC}"
    cat response.json
    rm -f response.json
else
    echo -e "${RED}❌ Lambda function test failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Lambda deployment completed!${NC}"
echo -e "${YELLOW}📝 Next: Deploy frontend with ./deploy-frontend.sh${NC}"

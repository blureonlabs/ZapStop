#!/bin/bash

# ZapStop Lambda Deployment Script
# This script deploys the ZapStop API to AWS Lambda with Aurora Serverless v2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGE=${1:-dev}
REGION=${2:-us-east-1}
PROFILE=${3:-default}

echo -e "${BLUE}🚀 ZapStop Lambda Deployment Script${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Stage: ${GREEN}$STAGE${NC}"
echo -e "Region: ${GREEN}$REGION${NC}"
echo -e "Profile: ${GREEN}$PROFILE${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
    exit 1
fi

# Check Serverless Framework
if ! command -v serverless &> /dev/null; then
    echo -e "${RED}❌ Serverless Framework not found. Installing...${NC}"
    npm install -g serverless
fi

# Check Python dependencies
if [ ! -f "backend/requirements-lambda.txt" ]; then
    echo -e "${RED}❌ Lambda requirements file not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install Python dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
cd backend
pip install -r requirements-lambda.txt
cd ..

# Deploy with Serverless Framework
echo -e "${YELLOW}🚀 Deploying with Serverless Framework...${NC}"

# Set AWS profile
export AWS_PROFILE=$PROFILE

# Deploy the stack
serverless deploy \
    --stage $STAGE \
    --region $REGION \
    --verbose

# Get deployment outputs
echo -e "${YELLOW}📊 Getting deployment outputs...${NC}"

API_URL=$(aws cloudformation describe-stacks \
    --stack-name zapstop-api-$STAGE \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text)

AURORA_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name zapstop-api-$STAGE \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`AuroraClusterEndpoint`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "API URL: ${GREEN}$API_URL${NC}"
echo -e"Aurora Endpoint: ${GREEN}$AURORA_ENDPOINT${NC}"
echo ""

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    echo -e "${YELLOW}💡 Check CloudWatch logs for details${NC}"
fi

# Test API docs
DOCS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs" || echo "000")

if [ "$DOCS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API documentation accessible${NC}"
else
    echo -e "${YELLOW}⚠️  API documentation not accessible (HTTP $DOCS_RESPONSE)${NC}"
fi

echo ""
echo -e "${BLUE}🎉 Deployment Summary:${NC}"
echo -e "✅ Lambda function deployed"
echo -e "✅ Aurora Serverless v2 cluster created"
echo -e "✅ API Gateway configured"
echo -e "✅ Secrets Manager configured"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Update your frontend API URL to: ${GREEN}$API_URL${NC}"
echo -e "2. Run database migrations: ${GREEN}alembic upgrade head${NC}"
echo -e "3. Test all API endpoints"
echo -e "4. Configure monitoring and alerting"
echo ""
echo -e "${BLUE}🔗 Useful Commands:${NC}"
echo -e "View logs: ${GREEN}serverless logs -f api --stage $STAGE${NC}"
echo -e "Remove stack: ${GREEN}serverless remove --stage $STAGE${NC}"
echo -e "Update stack: ${GREEN}serverless deploy --stage $STAGE${NC}"

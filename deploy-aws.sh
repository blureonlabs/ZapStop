#!/bin/bash

# 🚀 ZapStop AWS Deployment Script
# Deploys the complete AWS infrastructure for ZapStop

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="zapstop-prod"
REGION="us-east-1"
ENVIRONMENT="prod"

echo -e "${BLUE}🚀 Starting ZapStop AWS Deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Check if required files exist
if [ ! -f "aws-infrastructure/lambda-serverless.yaml" ]; then
    echo -e "${RED}❌ CloudFormation template not found${NC}"
    exit 1
fi

# Deploy CloudFormation stack
echo -e "${YELLOW}📦 Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file aws-infrastructure/lambda-serverless.yaml \
    --stack-name $STACK_NAME \
    --region $REGION \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_IAM

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CloudFormation stack deployed successfully${NC}"
else
    echo -e "${RED}❌ CloudFormation deployment failed${NC}"
    exit 1
fi

# Get stack outputs
echo -e "${YELLOW}📋 Getting stack outputs...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text)

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Stack outputs retrieved${NC}"

# Display important information
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "  API URL: ${GREEN}$API_URL${NC}"
echo -e "  Database: ${GREEN}$DB_ENDPOINT${NC}"
echo -e "  CloudFront: ${GREEN}$CLOUDFRONT_URL${NC}"
echo -e "  S3 Bucket: ${GREEN}$S3_BUCKET${NC}"

# Next steps
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "  1. Deploy backend to Lambda: ${BLUE}./deploy-lambda.sh${NC}"
echo -e "  2. Deploy frontend to S3: ${BLUE}./deploy-frontend.sh${NC}"
echo -e "  3. Test the deployment: ${BLUE}./test-aws-deployment.sh${NC}"

echo -e "${GREEN}🎉 AWS infrastructure deployment completed!${NC}"
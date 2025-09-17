#!/bin/bash

# ZapStop AWS Deployment Script
# Cost-optimized for 100 users, $40/month budget

set -e

echo "🚀 Deploying ZapStop to AWS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="zapstop-prod"
REGION="us-east-1"
ENVIRONMENT="prod"

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

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "Stack Name: $STACK_NAME"
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Create database optimization indexes
echo -e "${YELLOW}🔧 Step 1: Optimizing database performance...${NC}"
echo "Run this SQL on your Neon database to improve performance:"
echo "cat backend/database_optimization.sql | psql YOUR_DATABASE_URL"
echo ""

# Step 2: Deploy AWS infrastructure
echo -e "${YELLOW}🏗️ Step 2: Deploying AWS infrastructure...${NC}"

# Deploy the CloudFormation stack
aws cloudformation deploy \
    --template-file aws-infrastructure/lambda-serverless.yaml \
    --stack-name $STACK_NAME \
    --region $REGION \
    --parameter-overrides Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
else
    echo -e "${RED}❌ Infrastructure deployment failed!${NC}"
    exit 1
fi

# Step 3: Get outputs
echo -e "${YELLOW}📊 Step 3: Getting deployment outputs...${NC}"

API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
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

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Your AWS Resources:${NC}"
echo "API URL: $API_URL"
echo "Frontend URL: $CLOUDFRONT_URL"
echo "S3 Bucket: $S3_BUCKET"
echo ""

# Step 4: Deploy frontend to S3
echo -e "${YELLOW}🌐 Step 4: Deploying frontend to S3...${NC}"

# Build the frontend
echo "Building Next.js frontend..."
npm run build

# Upload to S3
echo "Uploading to S3..."
aws s3 sync out/ s3://$S3_BUCKET --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Origins.Items[0].DomainName=='$S3_BUCKET.s3.amazonaws.com'].Id" \
        --output text) \
    --paths "/*"

echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo ""

# Step 5: Update environment variables
echo -e "${YELLOW}⚙️ Step 5: Update your environment variables...${NC}"
echo "Update your frontend .env.local file:"
echo "NEXT_PUBLIC_API_URL=$API_URL"
echo ""

# Step 6: Cost estimation
echo -e "${YELLOW}💰 Step 6: Monthly Cost Estimation${NC}"
echo "Lambda (50 requests/day): ~$0.50"
echo "RDS t3.micro: ~$15"
echo "S3 + CloudFront: ~$2"
echo "API Gateway: ~$1"
echo "Route 53 (optional): ~$0.50"
echo "Total: ~$19/month (well under your $40 budget!)"
echo ""

# Step 7: Next steps
echo -e "${YELLOW}🎯 Next Steps:${NC}"
echo "1. Run database optimization SQL on your Neon database"
echo "2. Update frontend environment variables"
echo "3. Test your application at: $CLOUDFRONT_URL"
echo "4. Monitor costs in AWS Billing Dashboard"
echo ""

echo -e "${GREEN}🎉 ZapStop is now running on AWS!${NC}"
echo -e "${GREEN}Your app should be much faster now!${NC}"

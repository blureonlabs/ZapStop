#!/bin/bash

# 🚀 ZapStop Frontend Deployment Script
# Builds and deploys the Next.js frontend to S3 + CloudFront

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
S3_BUCKET="zapstop-prod-frontend"
REGION="us-east-1"
CLOUDFRONT_DISTRIBUTION_ID=""

echo -e "${BLUE}🚀 Starting frontend deployment...${NC}"

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the project root${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
npm install

# Build the application
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    echo -e "${RED}❌ Build failed. Please check the build output.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Get S3 bucket name from CloudFormation stack
echo -e "${YELLOW}📋 Getting S3 bucket name...${NC}"
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name zapstop-prod \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text)

if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ Could not get S3 bucket name from CloudFormation stack${NC}"
    exit 1
fi

echo -e "${GREEN}✅ S3 bucket: $S3_BUCKET${NC}"

# Upload to S3
echo -e "${YELLOW}📤 Uploading to S3...${NC}"
aws s3 sync out/ s3://$S3_BUCKET/ \
    --delete \
    --region $REGION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files uploaded to S3 successfully${NC}"
else
    echo -e "${RED}❌ S3 upload failed${NC}"
    exit 1
fi

# Get CloudFront distribution ID
echo -e "${YELLOW}📋 Getting CloudFront distribution ID...${NC}"
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name zapstop-prod \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}⚠️  CloudFront distribution ID not found. Skipping cache invalidation.${NC}"
else
    # Invalidate CloudFront cache
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --region $REGION

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ CloudFront cache invalidation initiated${NC}"
    else
        echo -e "${YELLOW}⚠️  CloudFront cache invalidation failed${NC}"
    fi
fi

# Get CloudFront URL
echo -e "${YELLOW}📋 Getting CloudFront URL...${NC}"
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name zapstop-prod \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text)

echo -e "${GREEN}🎉 Frontend deployment completed!${NC}"
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "  S3 Bucket: ${GREEN}$S3_BUCKET${NC}"
echo -e "  CloudFront URL: ${GREEN}$CLOUDFRONT_URL${NC}"
echo -e "  Region: ${GREEN}$REGION${NC}"

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "  1. Test the frontend: ${BLUE}curl $CLOUDFRONT_URL${NC}"
echo -e "  2. Update DNS records to point to CloudFront"
echo -e "  3. Test end-to-end functionality"

echo -e "${GREEN}🎉 Frontend deployment completed!${NC}"

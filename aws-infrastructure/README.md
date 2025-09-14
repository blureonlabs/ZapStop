# 🚀 ZapStop AWS Migration Infrastructure

This directory contains all the infrastructure-as-code files for migrating ZapStop to AWS Lambda + Aurora Serverless v2.

## 📁 Files Overview

### Infrastructure Templates
- **`serverless.yml`** - Serverless Framework template for easy deployment
- **`template.yaml`** - AWS SAM template (alternative deployment method)
- **`AWS_MIGRATION_GUIDE.md`** - Complete migration guide and instructions

### Key Features
- ✅ FastAPI on AWS Lambda with Mangum
- ✅ Aurora Serverless v2 (PostgreSQL)
- ✅ Secrets Manager for database credentials
- ✅ VPC configuration for security
- ✅ API Gateway with CORS
- ✅ ElastiCache Redis (optional)
- ✅ CloudWatch logging and monitoring

## 🚀 Quick Start

### Option 1: Serverless Framework (Recommended)
```bash
# Install dependencies
npm install -g serverless
npm install serverless-python-requirements

# Deploy
cd aws-infrastructure
serverless deploy --stage dev --region us-east-1
```

### Option 2: AWS SAM
```bash
# Install SAM CLI
brew install aws-sam-cli  # macOS
# or follow: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Deploy
cd aws-infrastructure
sam build
sam deploy --guided
```

## 📋 Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **VPC and Subnets** - You'll need to provide VPC IDs and subnet IDs
3. **Python 3.11** for Lambda runtime
4. **Node.js 18+** for Serverless Framework

## 🔧 Configuration

Before deploying, update the following in your chosen template:

### serverless.yml
```yaml
custom:
  lambdaSecurityGroupId: sg-xxxxxxxxx  # Your Lambda security group
  lambdaSubnetId1: subnet-xxxxxxxxx    # Private subnet 1
  lambdaSubnetId2: subnet-yyyyyyyyy    # Private subnet 2
```

### template.yaml
```yaml
Parameters:
  VpcId: vpc-xxxxxxxxx
  PrivateSubnet1Id: subnet-xxxxxxxxx
  PrivateSubnet2Id: subnet-yyyyyyyyy
```

## 💰 Cost Estimation

For 100 concurrent users:
- **Lambda**: ~$5-10/month
- **Aurora Serverless v2**: ~$50-100/month (0.5-16 ACU)
- **API Gateway**: ~$3.50 per 1M requests
- **Total**: ~$60-120/month

## 🔍 Monitoring

After deployment, monitor:
- Lambda metrics (duration, errors, throttles)
- Aurora ACU utilization
- API Gateway 4XX/5XX errors
- CloudWatch logs

## 📞 Support

See `AWS_MIGRATION_GUIDE.md` for detailed instructions and troubleshooting.

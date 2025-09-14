# 🛠️ ZapStop AWS Migration Scripts

This directory contains deployment and utility scripts for the AWS migration.

## 📁 Files

- **`deploy-lambda.sh`** - Automated deployment script for Serverless Framework

## 🚀 Usage

### Deploy Script
```bash
# Make executable
chmod +x aws-scripts/deploy-lambda.sh

# Deploy to dev environment
./aws-scripts/deploy-lambda.sh dev us-east-1

# Deploy to production
./aws-scripts/deploy-lambda.sh prod us-east-1 my-aws-profile
```

### Script Features
- ✅ Prerequisites checking
- ✅ Automatic dependency installation
- ✅ Deployment with progress tracking
- ✅ Health check testing
- ✅ Output summary
- ✅ Error handling

## 🔧 Prerequisites

The script checks for:
- AWS CLI
- Serverless Framework
- Python dependencies

## 📊 Output

After successful deployment, you'll get:
- API Gateway URL
- Aurora cluster endpoint
- Health check results
- Next steps instructions

# 🚀 ZapStop AWS Deployment Guide

This guide will walk you through deploying ZapStop to AWS Lambda + Aurora Serverless v2.

## 📋 Prerequisites

Before starting, ensure you have:

1. **AWS CLI** installed and configured
2. **Node.js 18+** installed
3. **Python 3.11** installed
4. **Git** installed
5. **AWS Account** with appropriate permissions

## 🔧 Setup

### 1. Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `me-central-1`
- Default output format: `json`

### 2. Install Dependencies

```bash
# Install Serverless Framework
npm install -g serverless
npm install -g serverless-python-requirements

# Install Python dependencies
cd backend
pip install -r requirements-lambda.txt
cd ..
```

## 🚀 Deployment

### Option 1: Automated Deployment (Recommended)

**For Windows (PowerShell):**
```powershell
.\deploy-aws.ps1 -Stage dev -Region me-central-1 -Profile default
```

**For Linux/Mac (Bash):**
```bash
./deploy-aws.sh dev me-central-1 default
```

### Option 2: Manual Deployment

#### Step 1: Deploy Backend Infrastructure

```bash
cd aws-infrastructure
npm install
serverless deploy --stage dev --region me-central-1 --verbose
```

#### Step 2: Get Deployment Outputs

```bash
# Get API Gateway URL
aws cloudformation describe-stacks \
  --stack-name zapstop-api-dev \
  --region me-central-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text

# Get Aurora Endpoint
aws cloudformation describe-stacks \
  --stack-name zapstop-api-dev \
  --region me-central-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSInstanceEndpoint`].OutputValue' \
  --output text
```

#### Step 3: Update Frontend Configuration

Create `.env.local` file:
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.me-central-1.amazonaws.com

# Application Configuration
NEXT_PUBLIC_APP_NAME=ZapStop
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_STAGE=dev
NEXT_PUBLIC_REGION=me-central-1
```

#### Step 4: Run Database Migration

```bash
cd backend
python migrate-aurora.py
```

#### Step 5: Build Frontend

```bash
npm install
npm run build
```

## 🧪 Testing

### Test Backend API

```bash
# Health check
curl https://your-api-gateway-url/health

# API documentation
curl https://your-api-gateway-url/docs

# Test authentication
curl -X POST https://your-api-gateway-url/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@zapstop.com&password=admin123"
```

### Test Frontend

```bash
# Start development server
npm run dev

# Or build and serve
npm run build
npm run start
```

## 📊 Monitoring

### View Logs

```bash
# Lambda logs
serverless logs -f api --stage dev --region me-central-1

# CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/zapstop"
```

### Monitor Resources

1. **AWS Console** → **Lambda** → View function metrics
2. **AWS Console** → **RDS** → View Aurora cluster metrics
3. **AWS Console** → **API Gateway** → View API metrics
4. **AWS Console** → **CloudWatch** → View custom dashboards

## 🔧 Configuration

### Environment Variables

The following environment variables are automatically configured:

- `STAGE`: Deployment stage (dev/staging/prod)
- `REGION`: AWS region (me-central-1)
- `DB_SECRET_NAME`: Secrets Manager secret name
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: JWT refresh secret
- `DEBUG`: Debug mode flag

### Secrets Manager

Database credentials are stored in AWS Secrets Manager:
- Secret name: `zapstop/aurora/credentials`
- Contains: username, password, host, port, dbname, sslmode

## 💰 Cost Optimization

### Aurora Serverless v2
- **Min Capacity**: 0.5 ACU (~$0.12/hour)
- **Max Capacity**: 16 ACU (auto-scales based on demand)
- **Storage**: $0.23/GB/month

### Lambda
- **Free Tier**: 1M requests/month, 400,000 GB-seconds
- **Pay-per-use**: $0.20 per 1M requests + $0.0000166667 per GB-second

### Estimated Monthly Costs
- **100 concurrent users**: $60-120/month
- **500 concurrent users**: $200-400/month
- **1000+ concurrent users**: $400+/month

## 🚨 Troubleshooting

### Common Issues

1. **Lambda Cold Start**
   - Enable provisioned concurrency for production
   - Use connection pooling (already configured)

2. **Database Connection Issues**
   - Check VPC configuration
   - Verify security groups
   - Ensure Lambda is in private subnets

3. **API Gateway CORS Issues**
   - Check CORS configuration in serverless.yml
   - Verify frontend API URL

4. **Secrets Manager Access**
   - Verify IAM permissions
   - Check secret ARN
   - Ensure Lambda has VPC access

### Debug Commands

```bash
# Check Lambda function
aws lambda get-function --function-name zapstop-api-dev-api

# Check Aurora cluster
aws rds describe-db-clusters --db-cluster-identifier zapstop-aurora-cluster-dev

# Check secrets
aws secretsmanager get-secret-value --secret-id zapstop/aurora/credentials

# Test database connection
aws rds-db connect --db-cluster-identifier zapstop-aurora-cluster-dev --db-user zapstop_user
```

## 🔄 Updates and Maintenance

### Update Backend

```bash
cd aws-infrastructure
serverless deploy --stage dev --region me-central-1
```

### Update Frontend

```bash
npm run build
# Deploy to Vercel/Netlify
```

### Database Migrations

```bash
cd backend
python migrate-aurora.py
```

## 🗑️ Cleanup

To remove all AWS resources:

```bash
cd aws-infrastructure
serverless remove --stage dev --region me-central-1
```

## 📞 Support

If you encounter issues:

1. Check CloudWatch logs
2. Verify IAM permissions
3. Test database connectivity
4. Review security group rules
5. Check VPC configuration

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring** with CloudWatch dashboards
2. **Configure alerting** for errors and performance
3. **Implement caching** with ElastiCache (optional)
4. **Set up CI/CD** for automated deployments
5. **Plan scaling** for traffic growth
6. **Implement backup strategy** for Aurora
7. **Set up disaster recovery** procedures

---

**Deployment Time**: 10-15 minutes  
**Downtime**: < 5 minutes (DNS switch)  
**Rollback Time**: < 2 minutes

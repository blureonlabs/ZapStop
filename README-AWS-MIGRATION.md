# 🚀 ZapStop AWS Migration Branch

This branch contains the complete migration of ZapStop from Neon PostgreSQL to AWS Lambda + Aurora Serverless v2.

## 🏗️ Architecture

```
Frontend (Vercel/Netlify) 
    ↓ HTTPS
API Gateway 
    ↓
Lambda Function (FastAPI + Mangum)
    ↓ VPC
Aurora Serverless v2 (PostgreSQL)
    ↑
Secrets Manager (DB Credentials)
```

## 📁 New Files Structure

```
zap-stop/
├── aws-infrastructure/           # Infrastructure as Code
│   ├── serverless.yml           # Serverless Framework template
│   ├── template.yaml            # AWS SAM template
│   ├── AWS_MIGRATION_GUIDE.md   # Complete migration guide
│   └── README.md                # Infrastructure overview
├── aws-scripts/                 # Deployment scripts
│   ├── deploy-lambda.sh         # Automated deployment
│   └── README.md                # Scripts documentation
├── backend/                     # Updated backend code
│   ├── lambda_handler.py        # Lambda entry point
│   ├── requirements-lambda.txt  # Lambda dependencies
│   ├── app/
│   │   ├── database_aurora.py   # Aurora + Secrets Manager
│   │   └── main_lambda.py       # Lambda-optimized FastAPI
│   └── ...
└── README-AWS-MIGRATION.md      # This file
```

## 🚀 Quick Migration

### 1. Prerequisites
```bash
# Install AWS CLI
aws configure

# Install Serverless Framework
npm install -g serverless
npm install serverless-python-requirements

# Install Python dependencies
cd backend
pip install -r requirements-lambda.txt
```

### 2. Deploy Infrastructure
```bash
# Option A: Serverless Framework (Recommended)
cd aws-infrastructure
serverless deploy --stage dev --region us-east-1

# Option B: AWS SAM
cd aws-infrastructure
sam build
sam deploy --guided
```

### 3. Run Database Migrations
```bash
cd backend
alembic upgrade head
```

### 4. Update Frontend
Update your frontend API URL to the new API Gateway endpoint.

## 🔧 Key Changes

### Backend Changes
- **`lambda_handler.py`** - Lambda entry point with Mangum
- **`database_aurora.py`** - Aurora Serverless v2 + Secrets Manager
- **`main_lambda.py`** - Lambda-optimized FastAPI app
- **`requirements-lambda.txt`** - Lambda-specific dependencies

### Infrastructure
- **Aurora Serverless v2** - Auto-scaling PostgreSQL (0.5-16 ACU)
- **Secrets Manager** - Secure credential storage
- **VPC Configuration** - Private subnets for security
- **API Gateway** - HTTP API with CORS support

## 💰 Cost Optimization

- **Aurora Serverless v2**: Scales to zero when idle
- **Lambda**: Pay-per-request pricing
- **Estimated monthly cost**: $60-120 for 100 concurrent users

## 🔍 Monitoring

- CloudWatch logs for Lambda functions
- Aurora performance insights
- API Gateway metrics
- Custom dashboards for business metrics

## 📋 Migration Checklist

- [ ] VPC and subnets configured
- [ ] Security groups properly set up
- [ ] Database credentials in Secrets Manager
- [ ] Lambda function deployed and tested
- [ ] API Gateway configured with CORS
- [ ] Database migrations applied
- [ ] Frontend API URL updated
- [ ] Monitoring and alerting enabled
- [ ] Cost alerts configured

## 🚨 Rollback Plan

If issues occur:
1. Keep Neon database until fully migrated
2. Update frontend API URL back to Neon
3. Use previous Lambda version
4. Restore from Aurora backup if needed

## 📞 Support

- **Migration Guide**: `aws-infrastructure/AWS_MIGRATION_GUIDE.md`
- **Infrastructure Docs**: `aws-infrastructure/README.md`
- **Scripts Docs**: `aws-scripts/README.md`

## 🎯 Next Steps

1. **Test thoroughly** in dev environment
2. **Monitor performance** and costs
3. **Optimize** Aurora capacity based on usage
4. **Implement caching** with ElastiCache
5. **Set up monitoring** and alerting
6. **Plan scaling** for traffic growth

---

**Migration Time**: 4-6 hours  
**Downtime**: < 5 minutes (DNS switch)  
**Rollback Time**: < 2 minutes

# 🚀 ZapStop AWS Migration Guide
## FastAPI → Lambda + Aurora Serverless v2

This guide migrates your ZapStop backend from Neon PostgreSQL to AWS Lambda + Aurora Serverless v2.

## 📋 Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ (for Serverless Framework)
- Python 3.11
- Docker (for Lambda packaging)

## 🏗️ Architecture Overview

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

## 🔧 Step 1: Update Backend Code

### 1.1 Install Lambda Dependencies

```bash
cd backend
pip install -r requirements-lambda.txt
```

### 1.2 Update Database Configuration

Replace your current `database.py` with the Aurora version:

```python
# In your main.py, replace:
from app.database import engine, Base

# With:
from app.database_aurora import engine, Base, init_database
```

### 1.3 Update Lambda Handler

Your `lambda_handler.py` is ready to use. Test it locally:

```bash
python lambda_handler.py
```

## 🚀 Step 2: Deploy with Serverless Framework

### 2.1 Install Serverless Framework

```bash
npm install -g serverless
npm install serverless-python-requirements
```

### 2.2 Configure VPC Parameters

Update `serverless.yml` with your VPC details:

```yaml
custom:
  lambdaSecurityGroupId: sg-xxxxxxxxx  # Your Lambda security group
  lambdaSubnetId1: subnet-xxxxxxxxx    # Private subnet 1
  lambdaSubnetId2: subnet-yyyyyyyyy    # Private subnet 2
```

### 2.3 Deploy Infrastructure

```bash
# Deploy to dev environment
serverless deploy --stage dev --region us-east-1

# Deploy to production
serverless deploy --stage prod --region us-east-1
```

## 🚀 Step 3: Deploy with AWS SAM (Alternative)

### 3.1 Install SAM CLI

```bash
# macOS
brew install aws-sam-cli

# Linux/Windows
# Follow: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

### 3.2 Build and Deploy

```bash
# Build the application
sam build

# Deploy with guided setup
sam deploy --guided

# Deploy to specific environment
sam deploy --parameter-overrides Stage=prod VpcId=vpc-xxxxxxxxx PrivateSubnet1Id=subnet-xxxxxxxxx PrivateSubnet2Id=subnet-yyyyyyyyy
```

## 🗄️ Step 4: Database Migration

### 4.1 Install Alembic (if not already installed)

```bash
pip install alembic
```

### 4.2 Create Migration Script

```bash
cd backend
alembic init alembic
```

### 4.3 Configure Alembic for Aurora

Update `alembic.ini`:

```ini
sqlalchemy.url = postgresql://username:password@aurora-endpoint:5432/zapstop
```

Update `alembic/env.py`:

```python
from app.database_aurora import engine
from app.models import Base

target_metadata = Base.metadata
```

### 4.4 Run Migrations

```bash
# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations to Aurora
alembic upgrade head
```

## 🔐 Step 5: Secrets Management

### 5.1 Create Database Secret

```bash
aws secretsmanager create-secret \
  --name "zapstop/aurora/credentials" \
  --description "Database credentials for ZapStop" \
  --secret-string '{
    "username": "zapstop_user",
    "password": "your-secure-password",
    "host": "your-aurora-endpoint.cluster-xyz.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "dbname": "zapstop",
    "sslmode": "require"
  }'
```

### 5.2 Update Lambda Environment Variables

The infrastructure templates automatically configure these, but verify:

- `DB_SECRET_NAME`: `zapstop/aurora/credentials`
- `REDIS_SECRET_NAME`: `zapstop/redis/credentials`
- `JWT_SECRET`: Your JWT secret
- `JWT_REFRESH_SECRET`: Your refresh secret

## 🧪 Step 6: Testing

### 6.1 Test Lambda Function Locally

```bash
# Test with SAM
sam local start-api

# Test with Serverless
serverless invoke local --function api
```

### 6.2 Test API Endpoints

```bash
# Health check
curl https://your-api-gateway-url/health

# Test authentication
curl -X POST https://your-api-gateway-url/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@zapstop.com&password=admin123"
```

## 📊 Step 7: Performance Optimization

### 7.1 Lambda Cold Start Mitigation

- **Provisioned Concurrency**: For production, enable provisioned concurrency
- **Connection Pooling**: Use NullPool for Lambda (already configured)
- **Warm-up**: Implement Lambda warm-up functions

### 7.2 Aurora Serverless v2 Scaling

- **Min Capacity**: 0.5 ACU (cost-effective for low traffic)
- **Max Capacity**: 16 ACU (handles traffic spikes)
- **Auto-pause**: Automatically scales to zero when idle

## 💰 Cost Optimization

### 7.1 Lambda Costs
- **Free Tier**: 1M requests/month, 400,000 GB-seconds
- **Pay-per-use**: $0.20 per 1M requests + $0.0000166667 per GB-second

### 7.2 Aurora Serverless v2 Costs
- **Min Capacity**: 0.5 ACU = ~$0.12/hour
- **Scaling**: Pay only for what you use
- **Storage**: $0.23/GB/month

### 7.3 Estimated Monthly Costs (100 concurrent users)
- **Lambda**: ~$5-10/month
- **Aurora**: ~$50-100/month
- **API Gateway**: ~$3.50 per 1M requests
- **Total**: ~$60-120/month

## 🔧 Troubleshooting

### Common Issues

1. **Cold Start Latency**
   - Enable provisioned concurrency
   - Use connection pooling
   - Implement warm-up functions

2. **Database Connection Issues**
   - Check VPC configuration
   - Verify security groups
   - Ensure Lambda is in private subnets

3. **Secrets Manager Access**
   - Verify IAM permissions
   - Check secret ARN
   - Ensure Lambda has VPC access to Secrets Manager

4. **Aurora Scaling Issues**
   - Monitor ACU usage
   - Adjust min/max capacity
   - Check for connection limits

### Debugging Commands

```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/zapstop"

# Test database connection
aws rds describe-db-clusters --db-cluster-identifier zapstop-aurora-cluster

# Check secrets
aws secretsmanager get-secret-value --secret-id zapstop/aurora/credentials
```

## 🚀 Production Deployment Checklist

- [ ] VPC and subnets configured
- [ ] Security groups properly configured
- [ ] Database credentials in Secrets Manager
- [ ] Lambda function deployed and tested
- [ ] API Gateway configured with CORS
- [ ] Database migrations applied
- [ ] Monitoring and logging enabled
- [ ] Cost alerts configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan in place

## 📈 Monitoring and Alerting

### CloudWatch Metrics to Monitor

1. **Lambda Metrics**
   - Duration
   - Errors
   - Throttles
   - Concurrent executions

2. **Aurora Metrics**
   - ACU utilization
   - Connection count
   - CPU utilization
   - Freeable memory

3. **API Gateway Metrics**
   - 4XX errors
   - 5XX errors
   - Latency
   - Count

### Recommended Alerts

```yaml
# CloudWatch Alarms
LambdaErrors:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: ZapStop-Lambda-Errors
    MetricName: Errors
    Namespace: AWS/Lambda
    Statistic: Sum
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold

AuroraHighACU:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: ZapStop-Aurora-High-ACU
    MetricName: ServerlessDatabaseCapacity
    Namespace: AWS/RDS
    Statistic: Average
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
```

## 🔄 Rollback Plan

If issues occur, you can quickly rollback:

1. **Keep Neon Database**: Don't delete until fully migrated
2. **DNS Switch**: Update frontend API URL to point back to Neon
3. **Lambda Rollback**: Use previous Lambda version
4. **Database Restore**: Restore from Aurora backup

## 📞 Support

For issues with this migration:

1. Check CloudWatch logs
2. Verify IAM permissions
3. Test database connectivity
4. Review security group rules
5. Check VPC configuration

## 🎯 Next Steps

After successful migration:

1. **Monitor Performance**: Set up CloudWatch dashboards
2. **Optimize Costs**: Review and adjust Aurora capacity
3. **Implement Caching**: Add ElastiCache for better performance
4. **Add Monitoring**: Set up comprehensive alerting
5. **Plan Scaling**: Prepare for traffic growth

---

**Migration Time Estimate**: 4-6 hours
**Downtime**: < 5 minutes (DNS switch)
**Rollback Time**: < 2 minutes

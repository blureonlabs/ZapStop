# 🚀 ZapStop AWS Deployment Plan

## 📋 **Overview**
Complete migration from Neon + Render to AWS with cost optimization for 100 users, $40/month budget.

## 🎯 **Target Architecture**
```
Frontend (Next.js) → CloudFront CDN → S3 Bucket
Backend (FastAPI) → Lambda + API Gateway
Database → RDS PostgreSQL (t3.micro)
Caching → ElastiCache Redis (optional)
Monitoring → CloudWatch
```

## 💰 **Cost Breakdown (Monthly)**
| Service | Configuration | Cost |
|---------|---------------|------|
| **RDS PostgreSQL** | db.t3.micro | $15 |
| **Lambda** | 512MB, 100K requests | $5 |
| **API Gateway** | 100K requests | $3.50 |
| **S3 + CloudFront** | 1GB storage, 10GB transfer | $2 |
| **CloudWatch** | Logs + Metrics | $2 |
| **VPC + NAT** | Basic setup | $5 |
| **Total** | | **~$32.50/month** |

## 🗂️ **Phase 1: Infrastructure Setup (Day 1)**

### 1.1 AWS Account Setup
- [ ] Create AWS account (if not exists)
- [ ] Set up IAM user with required permissions
- [ ] Configure AWS CLI
- [ ] Set up billing alerts ($50 threshold)

### 1.2 VPC and Networking
- [ ] Create VPC with public/private subnets
- [ ] Set up NAT Gateway for private subnet access
- [ ] Configure security groups
- [ ] Set up Route 53 (optional)

### 1.3 Database Setup
- [ ] Create RDS PostgreSQL instance (t3.micro)
- [ ] Configure security groups
- [ ] Set up automated backups
- [ ] Test database connectivity

## 🗂️ **Phase 2: Backend Migration (Day 2)**

### 2.1 Lambda Preparation
- [ ] Create Lambda deployment package
- [ ] Set up Lambda layers for dependencies
- [ ] Configure environment variables
- [ ] Test Lambda function locally

### 2.2 API Gateway Setup
- [ ] Create REST API
- [ ] Configure CORS
- [ ] Set up custom domain (optional)
- [ ] Deploy API Gateway

### 2.3 Database Migration
- [ ] Export data from Neon PostgreSQL
- [ ] Import data to RDS PostgreSQL
- [ ] Verify data integrity
- [ ] Update connection strings

## 🗂️ **Phase 3: Frontend Deployment (Day 3)**

### 3.1 S3 Setup
- [ ] Create S3 bucket for frontend
- [ ] Configure bucket policies
- [ ] Set up static website hosting
- [ ] Upload frontend build

### 3.2 CloudFront Setup
- [ ] Create CloudFront distribution
- [ ] Configure caching rules
- [ ] Set up custom error pages
- [ ] Test CDN performance

## 🗂️ **Phase 4: Monitoring & Optimization (Day 4)**

### 4.1 CloudWatch Setup
- [ ] Create CloudWatch dashboards
- [ ] Set up log groups
- [ ] Configure alarms
- [ ] Set up billing alerts

### 4.2 Performance Testing
- [ ] Load test API endpoints
- [ ] Monitor database performance
- [ ] Optimize Lambda cold starts
- [ ] Test frontend loading times

## 🗂️ **Phase 5: Go Live (Day 5)**

### 5.1 DNS Configuration
- [ ] Update DNS records
- [ ] Configure SSL certificates
- [ ] Test end-to-end functionality
- [ ] Monitor for issues

### 5.2 Cleanup
- [ ] Remove old Neon database
- [ ] Remove Render deployment
- [ ] Update documentation
- [ ] Train team on AWS console

## 🛠️ **Technical Implementation**

### Backend (Lambda + API Gateway)
```yaml
# Lambda Configuration
Runtime: python3.11
Memory: 512 MB
Timeout: 30 seconds
Environment Variables:
  - DATABASE_URL: postgresql://...
  - JWT_SECRET: your-secret
  - ALLOWED_ORIGINS: https://your-domain.com
```

### Database (RDS PostgreSQL)
```yaml
# RDS Configuration
Instance Class: db.t3.micro
Engine: PostgreSQL 15.4
Storage: 20 GB (gp2)
Backup Retention: 1 day
Multi-AZ: false (cost optimization)
```

### Frontend (S3 + CloudFront)
```yaml
# CloudFront Configuration
Price Class: PriceClass_100
Caching: 24 hours for static assets
Compression: Enabled
Custom Error Pages: SPA routing
```

## 📊 **Monitoring & Alerts**

### CloudWatch Alarms
- [ ] High Lambda error rate (>5%)
- [ ] High database CPU (>80%)
- [ ] High API Gateway latency (>2s)
- [ ] Monthly cost > $40

### Dashboards
- [ ] API performance metrics
- [ ] Database performance
- [ ] Cost tracking
- [ ] Error rates

## 🔧 **Deployment Scripts**

### 1. Infrastructure Deployment
```bash
# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file aws-infrastructure/lambda-serverless.yaml \
  --stack-name zapstop-prod \
  --parameter-overrides Environment=prod
```

### 2. Backend Deployment
```bash
# Package and deploy Lambda
./deploy-lambda.sh
```

### 3. Frontend Deployment
```bash
# Build and deploy frontend
npm run build
aws s3 sync dist/ s3://zapstop-prod-frontend/
```

## 🚨 **Rollback Plan**

### If Issues Occur:
1. **Immediate**: Switch DNS back to Render
2. **Database**: Restore from Neon backup
3. **Backend**: Revert to Render deployment
4. **Frontend**: Revert to Netlify deployment

### Rollback Commands:
```bash
# Switch DNS
# Update CNAME records to point back to Render/Netlify

# Restore database
# Import from Neon backup

# Revert backend
# Deploy to Render
```

## 📈 **Success Metrics**

### Performance Targets:
- [ ] API response time < 500ms
- [ ] Frontend load time < 2s
- [ ] Database query time < 100ms
- [ ] 99.9% uptime

### Cost Targets:
- [ ] Monthly cost < $40
- [ ] Cost per user < $0.40
- [ ] Cost per request < $0.01

## 🎯 **Next Steps**

1. **Review and approve this plan**
2. **Set up AWS account and permissions**
3. **Begin Phase 1: Infrastructure Setup**
4. **Monitor progress and adjust as needed**

## 📞 **Support & Resources**

- **AWS Documentation**: https://docs.aws.amazon.com/
- **CloudFormation Templates**: `aws-infrastructure/`
- **Deployment Scripts**: `deploy-aws.sh`
- **Cost Calculator**: https://calculator.aws/

---

**Ready to start? Let's begin with Phase 1! 🚀**

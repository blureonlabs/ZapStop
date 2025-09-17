# 🧹 AWS Cleanup Guide - ZapStop Project

This guide will help you completely remove all AWS resources created for the ZapStop project.

## 🚨 IMPORTANT WARNINGS

- **BACKUP YOUR DATA**: If you have important data in Aurora/RDS, export it before deletion
- **COST IMPACT**: Some services continue to incur costs even when idle
- **IRREVERSIBLE**: Once deleted, resources cannot be recovered

## 📋 Step-by-Step Cleanup Process

### 1. CloudFormation Stacks (Start Here - Easiest Method)

**AWS Console → CloudFormation**

Look for and delete these stacks:
- `zapstop-api-dev`
- `zapstop-api-prod` 
- `serverless-zapstop-api-dev`
- `serverless-zapstop-api-prod`
- Any stack containing "zapstop"

**Action**: Select each stack → Delete → Confirm deletion

### 2. Lambda Functions

**AWS Console → Lambda**

Search for and delete:
- `zapstop-api-dev-api`
- `zapstop-api-prod-api`
- Any function with "zapstop" in the name

**Action**: Select function → Actions → Delete

### 3. API Gateway

**AWS Console → API Gateway**

Delete APIs named:
- `zapstop-api`
- `zapstop-api-dev`
- `zapstop-api-prod`

**Action**: Select API → Actions → Delete

### 4. RDS/Aurora Databases

**AWS Console → RDS**

⚠️ **WARNING: This will delete all data!**

Look for:
- Aurora Serverless clusters with "zapstop" in name
- RDS instances with "zapstop" in name
- Database names: "zapstop"

**Action**: Select database → Actions → Delete → Confirm

### 5. Secrets Manager

**AWS Console → Secrets Manager**

Delete secrets:
- `zapstop/aurora/credentials`
- Any secret containing "zapstop"

**Action**: Select secret → Actions → Delete secret

### 6. CloudWatch Logs

**AWS Console → CloudWatch → Logs**

Delete log groups:
- `/aws/lambda/zapstop-api-dev-api`
- `/aws/lambda/zapstop-api-prod-api`
- Any log group with "zapstop"

**Action**: Select log group → Actions → Delete log group(s)

### 7. IAM Roles

**AWS Console → IAM → Roles**

Delete roles:
- `zapstop-api-dev-us-east-1-lambdaRole`
- `zapstop-api-prod-us-east-1-lambdaRole`
- Any role containing "zapstop"

**Action**: Select role → Delete role

### 8. VPC and Networking

**AWS Console → VPC**

Check and delete if created for this project:
- Security groups with "zapstop" in name
- VPCs created specifically for ZapStop
- Subnets created for the project

**Action**: Delete resources (be careful not to delete default VPC)

### 9. S3 Buckets (if any)

**AWS Console → S3**

Look for buckets:
- `zapstop-*`
- `serverless-deployments-*` (if used for ZapStop)

**Action**: Empty bucket → Delete bucket

### 10. ElastiCache (if used)

**AWS Console → ElastiCache**

Delete Redis clusters if created for ZapStop.

## 🔍 Verification Steps

### Check Billing Dashboard
1. Go to **AWS Console → Billing & Cost Management**
2. Check for any unexpected charges
3. Look for services still running

### Search for Remaining Resources
Use AWS Resource Groups & Tag Editor to search for:
- Resources tagged with "zapstop"
- Resources in specific regions (us-east-1, me-central-1)

## 🛠️ AWS CLI Commands (Alternative Method)

If you prefer using AWS CLI, here are some commands:

```bash
# List all CloudFormation stacks
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `zapstop`)]'

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name zapstop-api-dev

# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `zapstop`)]'

# Delete Lambda function
aws lambda delete-function --function-name zapstop-api-dev-api

# List API Gateways
aws apigateway get-rest-apis --query 'items[?contains(name, `zapstop`)]'

# List RDS instances
aws rds describe-db-instances --query 'DBInstances[?contains(DBInstanceIdentifier, `zapstop`)]'

# List Aurora clusters
aws rds describe-db-clusters --query 'DBClusters[?contains(DBClusterIdentifier, `zapstop`)]'
```

## ✅ Final Verification

After cleanup, verify:
1. No resources in billing dashboard
2. No unexpected charges
3. All ZapStop-related resources removed
4. Project is completely AWS-free

## 🆘 Troubleshooting

### If resources won't delete:
1. Check for dependencies
2. Look at error messages for guidance
3. Some resources need to be deleted in specific order
4. Check IAM permissions

### If you see unexpected charges:
1. Check for hidden resources
2. Look in different AWS regions
3. Check for auto-scaling groups
4. Verify all CloudFormation stacks are deleted

---

**Note**: This cleanup process will completely remove all AWS infrastructure for the ZapStop project. Make sure you have backups of any important data before proceeding.

# 🚀 Manual AWS Deployment Steps

Since AWS CLI was just installed, you may need to restart your terminal or refresh the environment. Here are the manual steps to deploy ZapStop to AWS:

## 📋 Prerequisites Check

1. **Restart your terminal** or open a new PowerShell window
2. **Verify AWS CLI**: `aws --version`
3. **Configure AWS CLI**: `aws configure`

## 🔧 AWS Configuration

When you run `aws configure`, enter:
- **AWS Access Key ID**: [Your AWS Access Key]
- **AWS Secret Access Key**: [Your AWS Secret Key]
- **Default region name**: `me-central-1`
- **Default output format**: `json`

## 🚀 Deployment Steps

### Step 1: Navigate to Infrastructure Directory
```powershell
cd aws-infrastructure
```

### Step 2: Install Dependencies
```powershell
npm install
```

### Step 3: Deploy Backend
```powershell
serverless deploy --stage dev --region me-central-1 --verbose
```

### Step 4: Get Deployment Outputs
After deployment, note the API Gateway URL from the output.

### Step 5: Update Frontend Configuration
Create `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.execute-api.me-central-1.amazonaws.com
NEXT_PUBLIC_APP_NAME=ZapStop
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_STAGE=dev
NEXT_PUBLIC_REGION=me-central-1
```

### Step 6: Run Database Migration
```powershell
cd backend
python migrate-aurora.py
```

### Step 7: Build Frontend
```powershell
cd ..
npm install
npm run build
```

## 🧪 Testing

### Test API
```powershell
curl https://your-api-gateway-url/health
```

### Test Frontend
```powershell
npm run dev
```

## 📊 What Gets Deployed

1. **Lambda Function**: FastAPI application running on AWS Lambda
2. **Aurora Serverless v2**: PostgreSQL database with auto-scaling
3. **API Gateway**: HTTP API with CORS support
4. **Secrets Manager**: Secure storage for database credentials
5. **VPC Configuration**: Private subnets for security
6. **Security Groups**: Proper network access controls

## 💰 Estimated Costs

- **Aurora Serverless v2**: $0.12/hour (0.5 ACU minimum)
- **Lambda**: $0.20 per 1M requests
- **API Gateway**: $3.50 per 1M requests
- **Total for 100 users**: ~$60-120/month

## 🔧 Troubleshooting

### If AWS CLI is not recognized:
1. Restart your terminal
2. Or add AWS CLI to PATH manually
3. Or use the full path: `C:\Program Files\Amazon\AWSCLIV2\aws.exe`

### If deployment fails:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify region permissions
3. Check CloudFormation console for errors

### If database connection fails:
1. Check VPC configuration
2. Verify security groups
3. Check Secrets Manager permissions

## 📞 Next Steps After Deployment

1. **Test all API endpoints**
2. **Update frontend to use new API URL**
3. **Set up monitoring in CloudWatch**
4. **Configure alerts for errors**
5. **Plan for production scaling**

---

**Ready to deploy?** Follow the steps above in order!

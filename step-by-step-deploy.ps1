# Step-by-Step AWS Deployment
# Run each step manually to avoid script issues

Write-Host "🚀 ZapStop Step-by-Step AWS Deployment" -ForegroundColor Blue
Write-Host "======================================" -ForegroundColor Blue
Write-Host ""

# Step 1: Fix AWS CLI PATH
Write-Host "Step 1: Adding AWS CLI to PATH..." -ForegroundColor Yellow
$env:PATH += ";C:\Program Files\Amazon\AWSCLIV2"
Write-Host "✅ AWS CLI added to PATH" -ForegroundColor Green
Write-Host ""

# Step 2: Test AWS CLI
Write-Host "Step 2: Testing AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" --version
    Write-Host "✅ AWS CLI working: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI test failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Configure AWS (if needed)
Write-Host "Step 3: AWS Configuration" -ForegroundColor Yellow
Write-Host "Run this command to configure AWS:" -ForegroundColor Blue
Write-Host "& 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' configure" -ForegroundColor Green
Write-Host ""
Write-Host "Enter these values when prompted:" -ForegroundColor Blue
Write-Host "  AWS Access Key ID: [Your Access Key]" -ForegroundColor Yellow
Write-Host "  AWS Secret Access Key: [Your Secret Key]" -ForegroundColor Yellow
Write-Host "  Default region name: me-central-1" -ForegroundColor Yellow
Write-Host "  Default output format: json" -ForegroundColor Yellow
Write-Host ""

# Step 4: Test AWS Connection
Write-Host "Step 4: Test AWS Connection" -ForegroundColor Yellow
Write-Host "Run this command to test:" -ForegroundColor Blue
Write-Host "& 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' sts get-caller-identity" -ForegroundColor Green
Write-Host ""

# Step 5: Navigate to Infrastructure
Write-Host "Step 5: Navigate to Infrastructure Directory" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor Blue
Write-Host "cd aws-infrastructure" -ForegroundColor Green
Write-Host ""

# Step 6: Install Dependencies
Write-Host "Step 6: Install Dependencies" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor Blue
Write-Host "npm install" -ForegroundColor Green
Write-Host ""

# Step 7: Deploy
Write-Host "Step 7: Deploy to AWS" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor Blue
Write-Host "serverless deploy --stage dev --region me-central-1" -ForegroundColor Green
Write-Host ""

# Step 8: Get API URL
Write-Host "Step 8: Get API URL" -ForegroundColor Yellow
Write-Host "After deployment, run this to get your API URL:" -ForegroundColor Blue
Write-Host "& 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' cloudformation describe-stacks --stack-name 'zapstop-api-dev' --region me-central-1 --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Summary of Commands to Run:" -ForegroundColor Blue
Write-Host "1. & 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' configure" -ForegroundColor Green
Write-Host "2. & 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' sts get-caller-identity" -ForegroundColor Green
Write-Host "3. cd aws-infrastructure" -ForegroundColor Green
Write-Host "4. npm install" -ForegroundColor Green
Write-Host "5. serverless deploy --stage dev --region me-central-1" -ForegroundColor Green
Write-Host ""

Write-Host "🎯 Ready to deploy? Run the commands above in order!" -ForegroundColor Green

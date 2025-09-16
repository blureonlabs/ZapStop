# ZapStop Quick Start Script
# This script helps you get started with AWS deployment

Write-Host "🚀 ZapStop Quick Start" -ForegroundColor Blue
Write-Host "====================" -ForegroundColor Blue
Write-Host ""

# Check if AWS CLI is available
Write-Host "🔍 Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>$null
    if ($awsVersion) {
        Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ AWS CLI not found" -ForegroundColor Red
        Write-Host "   Please restart your terminal and try again" -ForegroundColor Yellow
        Write-Host "   Or run: winget install Amazon.AWSCLI" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ AWS CLI not found" -ForegroundColor Red
    Write-Host "   Please restart your terminal and try again" -ForegroundColor Yellow
    Write-Host "   Or run: winget install Amazon.AWSCLI" -ForegroundColor Yellow
    exit 1
}

# Check AWS configuration
Write-Host "🔐 Checking AWS configuration..." -ForegroundColor Yellow
try {
    $awsIdentity = aws sts get-caller-identity 2>$null
    if ($awsIdentity) {
        Write-Host "✅ AWS CLI configured successfully" -ForegroundColor Green
        Write-Host "   Account: $($awsIdentity | ConvertFrom-Json | Select-Object -ExpandProperty Account)" -ForegroundColor Green
    } else {
        Write-Host "❌ AWS CLI not configured" -ForegroundColor Red
        Write-Host "   Please run: aws configure" -ForegroundColor Yellow
        Write-Host "   Use region: me-central-1" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ AWS CLI not configured" -ForegroundColor Red
    Write-Host "   Please run: aws configure" -ForegroundColor Yellow
    Write-Host "   Use region: me-central-1" -ForegroundColor Yellow
    exit 1
}

# Check Serverless Framework
Write-Host "⚡ Checking Serverless Framework..." -ForegroundColor Yellow
try {
    $serverlessVersion = serverless --version 2>$null
    if ($serverlessVersion) {
        Write-Host "✅ Serverless Framework found: $serverlessVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Serverless Framework not found" -ForegroundColor Red
        Write-Host "   Installing..." -ForegroundColor Yellow
        npm install -g serverless
        npm install -g serverless-python-requirements
        Write-Host "✅ Serverless Framework installed" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Serverless Framework not found" -ForegroundColor Red
    Write-Host "   Installing..." -ForegroundColor Yellow
    npm install -g serverless
    npm install -g serverless-python-requirements
    Write-Host "✅ Serverless Framework installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 All prerequisites are ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Blue
Write-Host "1. Navigate to aws-infrastructure: cd aws-infrastructure" -ForegroundColor Yellow
Write-Host "2. Install dependencies: npm install" -ForegroundColor Yellow
Write-Host "3. Deploy: serverless deploy --stage dev --region me-central-1" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 For detailed instructions, see: MANUAL_DEPLOYMENT_STEPS.md" -ForegroundColor Blue
Write-Host ""
Write-Host "🚀 Ready to deploy!" -ForegroundColor Green

# Configure AWS and Deploy ZapStop
# This script handles AWS CLI PATH issues and deploys the application

Write-Host "🚀 ZapStop AWS Configuration and Deployment" -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue
Write-Host ""

# Add AWS CLI to PATH for this session
Write-Host "🔧 Adding AWS CLI to PATH..." -ForegroundColor Yellow
$env:PATH += ";C:\Program Files\Amazon\AWSCLIV2"

# Test AWS CLI
Write-Host "🧪 Testing AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" --version
    Write-Host "✅ AWS CLI working: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI test failed" -ForegroundColor Red
    exit 1
}

# Check if AWS is already configured
Write-Host "🔐 Checking AWS configuration..." -ForegroundColor Yellow
try {
    $identity = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" sts get-caller-identity 2>$null
    if ($identity) {
        $account = ($identity | ConvertFrom-Json).Account
        Write-Host "✅ AWS already configured - Account: $account" -ForegroundColor Green
        $skipConfig = $true
    } else {
        Write-Host "⚠️  AWS not configured" -ForegroundColor Yellow
        $skipConfig = $false
    }
} catch {
    Write-Host "⚠️  AWS not configured" -ForegroundColor Yellow
    $skipConfig = $false
}

# Configure AWS if needed
if (-not $skipConfig) {
    Write-Host "🔐 Configuring AWS CLI..." -ForegroundColor Yellow
    Write-Host "   Please enter your AWS credentials:" -ForegroundColor Blue
    Write-Host ""
    
    $AccessKey = Read-Host "AWS Access Key ID"
    $SecretKey = Read-Host "AWS Secret Access Key" -AsSecureString
    $Region = "me-central-1"
    $OutputFormat = "json"
    
    # Convert secure string to plain text
    $SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))
    
    # Set environment variables
    $env:AWS_ACCESS_KEY_ID = $AccessKey
    $env:AWS_SECRET_ACCESS_KEY = $SecretKeyPlain
    $env:AWS_DEFAULT_REGION = $Region
    $env:AWS_DEFAULT_OUTPUT = $OutputFormat
    
    Write-Host "✅ AWS credentials set" -ForegroundColor Green
}

# Test AWS connection
Write-Host "🧪 Testing AWS connection..." -ForegroundColor Yellow
try {
    $identity = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" sts get-caller-identity
    if ($identity) {
        $account = ($identity | ConvertFrom-Json).Account
        Write-Host "✅ AWS connection successful - Account: $account" -ForegroundColor Green
    } else {
        Write-Host "❌ AWS connection failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ AWS connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Check Serverless Framework
Write-Host "⚡ Checking Serverless Framework..." -ForegroundColor Yellow
try {
    $serverlessVersion = serverless --version 2>$null
    if ($serverlessVersion) {
        Write-Host "✅ Serverless Framework found" -ForegroundColor Green
    } else {
        Write-Host "📦 Installing Serverless Framework..." -ForegroundColor Yellow
        npm install -g serverless
        npm install -g serverless-python-requirements
        Write-Host "✅ Serverless Framework installed" -ForegroundColor Green
    }
} catch {
    Write-Host "📦 Installing Serverless Framework..." -ForegroundColor Yellow
    npm install -g serverless
    npm install -g serverless-python-requirements
    Write-Host "✅ Serverless Framework installed" -ForegroundColor Green
}

# Navigate to infrastructure directory
Write-Host "📁 Navigating to infrastructure directory..." -ForegroundColor Yellow
Set-Location aws-infrastructure

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Deploy
Write-Host "🚀 Deploying to AWS..." -ForegroundColor Yellow
Write-Host "   Stage: dev" -ForegroundColor Green
Write-Host "   Region: me-central-1" -ForegroundColor Green
Write-Host ""

# Use the full path to aws.exe for serverless
$env:AWS_EXECUTABLE = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

serverless deploy --stage dev --region me-central-1 --verbose

# Get deployment outputs
Write-Host ""
Write-Host "📊 Getting deployment outputs..." -ForegroundColor Yellow

try {
    $API_URL = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" cloudformation describe-stacks --stack-name "zapstop-api-dev" --region me-central-1 --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
    $AURORA_ENDPOINT = & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" cloudformation describe-stacks --stack-name "zapstop-api-dev" --region me-central-1 --query 'Stacks[0].Outputs[?OutputKey==`RDSInstanceEndpoint`].OutputValue' --output text
    
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Deployment Summary:" -ForegroundColor Blue
    Write-Host "   API URL: $API_URL" -ForegroundColor Green
    Write-Host "   Aurora Endpoint: $AURORA_ENDPOINT" -ForegroundColor Green
    Write-Host ""
    
    # Create frontend environment file
    Write-Host "🎨 Creating frontend environment file..." -ForegroundColor Yellow
    Set-Location ..
    
    $envContent = @"
# ZapStop Frontend Environment Configuration
# Generated by deployment script

# API Configuration
NEXT_PUBLIC_API_URL=$API_URL

# Application Configuration
NEXT_PUBLIC_APP_NAME=ZapStop
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_STAGE=dev
NEXT_PUBLIC_REGION=me-central-1
"@

    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Frontend environment file created" -ForegroundColor Green
    
    # Test API
    Write-Host "🧪 Testing API..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -UseBasicParsing
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "✅ API health check passed" -ForegroundColor Green
        } else {
            Write-Host "⚠️  API health check returned status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  API health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Blue
    Write-Host "1. Run database migration: cd backend; python migrate-aurora.py" -ForegroundColor Yellow
    Write-Host "2. Build frontend: npm run build" -ForegroundColor Yellow
    Write-Host "3. Test your application" -ForegroundColor Yellow
    Write-Host "4. Deploy frontend to Vercel/Netlify" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔗 Test your API:" -ForegroundColor Blue
    Write-Host "   curl $API_URL/health" -ForegroundColor Green
    Write-Host "   curl $API_URL/docs" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to get deployment outputs" -ForegroundColor Red
    Write-Host "   Check AWS Console for deployment status" -ForegroundColor Yellow
}

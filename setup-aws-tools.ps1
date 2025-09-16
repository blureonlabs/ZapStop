# ZapStop AWS Tools Setup Script
# This script installs the required tools for AWS deployment

Write-Host "🚀 ZapStop AWS Tools Setup" -ForegroundColor Blue
Write-Host "============================" -ForegroundColor Blue
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  This script should be run as Administrator for best results" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Check Node.js
Write-Host "📦 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Python
Write-Host "🐍 Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python from https://python.org/" -ForegroundColor Red
    exit 1
}

# Install AWS CLI
Write-Host "☁️  Installing AWS CLI..." -ForegroundColor Yellow
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI already installed" -ForegroundColor Green
} catch {
    Write-Host "📥 Downloading AWS CLI installer..." -ForegroundColor Yellow
    
    # Download AWS CLI installer
    $installerUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
    $installerPath = "$env:TEMP\AWSCLIV2.msi"
    
    try {
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
        Write-Host "📦 Installing AWS CLI..." -ForegroundColor Yellow
        Start-Process msiexec.exe -Wait -ArgumentList "/i $installerPath /quiet"
        Write-Host "✅ AWS CLI installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install AWS CLI. Please install manually from https://aws.amazon.com/cli/" -ForegroundColor Red
        Write-Host "   Or run: winget install Amazon.AWSCLI" -ForegroundColor Yellow
    }
}

# Install Serverless Framework
Write-Host "⚡ Installing Serverless Framework..." -ForegroundColor Yellow
try {
    serverless --version | Out-Null
    Write-Host "✅ Serverless Framework already installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing Serverless Framework..." -ForegroundColor Yellow
    npm install -g serverless
    npm install -g serverless-python-requirements
    Write-Host "✅ Serverless Framework installed successfully" -ForegroundColor Green
}

# Install Python dependencies
Write-Host "🐍 Installing Python dependencies..." -ForegroundColor Yellow
Set-Location backend
pip install -r requirements-lambda.txt
Set-Location ..
Write-Host "✅ Python dependencies installed successfully" -ForegroundColor Green

# Install frontend dependencies
Write-Host "🎨 Installing frontend dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Frontend dependencies installed successfully" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Blue
Write-Host "1. Configure AWS CLI: aws configure" -ForegroundColor Yellow
Write-Host "2. Run deployment: .\deploy-aws.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 AWS CLI Configuration:" -ForegroundColor Blue
Write-Host "   AWS Access Key ID: [Your Access Key]" -ForegroundColor Yellow
Write-Host "   AWS Secret Access Key: [Your Secret Key]" -ForegroundColor Yellow
Write-Host "   Default region name: me-central-1" -ForegroundColor Yellow
Write-Host "   Default output format: json" -ForegroundColor Yellow

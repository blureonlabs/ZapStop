# AWS Environment Variables Setup
# Run this script to set AWS credentials as environment variables

Write-Host "🔐 AWS Environment Variables Setup" -ForegroundColor Blue
Write-Host "===================================" -ForegroundColor Blue
Write-Host ""

# Get AWS credentials from user
$AccessKey = Read-Host "Enter your AWS Access Key ID"
$SecretKey = Read-Host "Enter your AWS Secret Access Key" -AsSecureString
$Region = "me-central-1"

# Convert secure string to plain text
$SecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecretKey))

# Set environment variables
$env:AWS_ACCESS_KEY_ID = $AccessKey
$env:AWS_SECRET_ACCESS_KEY = $SecretKeyPlain
$env:AWS_DEFAULT_REGION = $Region

Write-Host ""
Write-Host "✅ AWS credentials set as environment variables" -ForegroundColor Green
Write-Host "   Region: $Region" -ForegroundColor Green
Write-Host "   Access Key: $($AccessKey.Substring(0,8))..." -ForegroundColor Green
Write-Host ""

# Test AWS connection
Write-Host "🧪 Testing AWS connection..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity
    if ($identity) {
        Write-Host "✅ AWS connection successful!" -ForegroundColor Green
        Write-Host "   Account: $($identity | ConvertFrom-Json | Select-Object -ExpandProperty Account)" -ForegroundColor Green
    } else {
        Write-Host "❌ AWS connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ AWS connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Blue
Write-Host "1. Run: .\quick-start.ps1" -ForegroundColor Yellow
Write-Host "2. Or proceed with deployment: cd aws-infrastructure" -ForegroundColor Yellow
Write-Host "3. Then: serverless deploy --stage dev --region me-central-1" -ForegroundColor Yellow

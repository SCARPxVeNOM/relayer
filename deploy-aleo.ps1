# Aleo Program Deployment Script
# Run this after Leo CLI is installed

Write-Host "🚀 Deploying Aleo Program..." -ForegroundColor Green
Write-Host ""

# Navigate to program directory
Set-Location "aleo\privacy_box"

# Load private key from .env
$envContent = Get-Content "..\..\.env" -Raw
if ($envContent -match "ALEO_PRIVATE_KEY=(.+)") {
    $privateKey = $matches[1].Trim()
    Write-Host "✅ Found ALEO_PRIVATE_KEY in .env" -ForegroundColor Green
} else {
    Write-Host "❌ ALEO_PRIVATE_KEY not found in .env" -ForegroundColor Red
    exit 1
}

# Check if Leo is installed
try {
    $leoVersion = leo --version 2>&1
    Write-Host "✅ Leo CLI: $leoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Leo CLI not found. Install with: cargo install leo-lang" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Building program..." -ForegroundColor Yellow
leo build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Deploying to Aleo testnet..." -ForegroundColor Yellow
$env:ALEO_PRIVATE_KEY = $privateKey
leo deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "📋 Check your program on: https://explorer.aleo.org" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check errors above." -ForegroundColor Red
}

# Return to project root
Set-Location "..\.."


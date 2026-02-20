# Deploy Envelop Aleo Programs (testnet)

$programs = @(
  "aleo\envelop_swap",
  "aleo\envelop_invoice",
  "aleo\envelop_payments",
  "aleo\envelop_yield"
)

if (!(Test-Path ".env")) {
  Write-Host ".env file not found" -ForegroundColor Red
  exit 1
}

$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "ALEO_PRIVATE_KEY=([^\r\n]+)") {
  Write-Host "ALEO_PRIVATE_KEY missing in .env" -ForegroundColor Red
  exit 1
}
$privateKey = $matches[1].Trim()

try {
  $version = leo --version
  Write-Host "Leo CLI: $version" -ForegroundColor Green
} catch {
  Write-Host "Leo CLI not found" -ForegroundColor Red
  exit 1
}

foreach ($program in $programs) {
  Write-Host ""
  Write-Host "=== $program ===" -ForegroundColor Cyan

  if (!(Test-Path "$program\src\main.leo")) {
    Write-Host "Missing $program\src\main.leo" -ForegroundColor Red
    exit 1
  }

  Write-Host "Building..." -ForegroundColor Yellow
  leo build --path $program
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host "Deploying..." -ForegroundColor Yellow
  leo deploy --path $program --network testnet --endpoint https://api.explorer.provable.com/v2 --private-key $privateKey --broadcast --yes
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green

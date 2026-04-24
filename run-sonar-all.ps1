# ============================================================
#  SmartSure - SonarQube Bulk Analysis Script
#  Usage: .\run-sonar-all.ps1 -Token "your_sonar_token"
# ============================================================

param(
    [string]$Token = ""
)

if (-not $Token) {
    $Token = Read-Host "Enter your SonarQube token"
}

if (-not $Token) {
    Write-Host "ERROR: No token provided. Exiting." -ForegroundColor Red
    exit 1
}

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

$services = @(
    @{ dir = "AuthService";              key = "smartsure-auth-service";      name = "SmartSure Auth Service" },
    @{ dir = "adminService";             key = "smartsure-admin-service";      name = "SmartSure Admin Service" },
    @{ dir = "PolicyService";            key = "smartsure-policy-service";     name = "SmartSure Policy Service" },
    @{ dir = "claimService";             key = "smartsure-claim-service";      name = "SmartSure Claim Service" },
    @{ dir = "paymentService";           key = "smartsure-payment-service";    name = "SmartSure Payment Service" },
    @{ dir = "ApiGatewaySmartSure";      key = "smartsure-api-gateway";        name = "SmartSure API Gateway" },
    @{ dir = "ServiceRegistrySmartSure"; key = "smartsure-service-registry";   name = "SmartSure Service Registry" },
    @{ dir = "config-server-smart-sure"; key = "smartsure-config-server";      name = "SmartSure Config Server" }
)

# Check SonarQube reachable
Write-Host ""
Write-Host "Checking SonarQube at http://localhost:9010 ..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:9010/api/system/status" -TimeoutSec 10
    if ($response.status -eq "UP") {
        Write-Host "SonarQube is UP and ready." -ForegroundColor Green
    } else {
        Write-Host "WARNING: SonarQube status is $($response.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: Cannot reach SonarQube. Is docker-compose up?" -ForegroundColor Red
    exit 1
}

$results = @()

foreach ($svc in $services) {
    $path = Join-Path $ROOT $svc.dir
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " Scanning: $($svc.name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    if (-not (Test-Path $path)) {
        Write-Host "SKIPPED - directory not found: $path" -ForegroundColor Yellow
        $results += [PSCustomObject]@{ Service = $svc.name; Status = "SKIPPED" }
        continue
    }

    Push-Location $path

    $mvnArgs = @(
        "clean", "verify", "sonar:sonar",
        "-Dsonar.projectKey=$($svc.key)",
        "-Dsonar.projectName=$($svc.name)",
        "-Dsonar.login=$Token",
        "-B"
    )

    & .\mvnw @mvnArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: $($svc.name) scanned." -ForegroundColor Green
        $results += [PSCustomObject]@{ Service = $svc.name; Status = "SUCCESS" }
    } else {
        Write-Host "FAILED: $($svc.name) scan failed (exit code $LASTEXITCODE)." -ForegroundColor Red
        $results += [PSCustomObject]@{ Service = $svc.name; Status = "FAILED" }
    }

    Pop-Location
}

# Summary
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host " SCAN SUMMARY" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
$results | Format-Table -AutoSize

$failed = $results | Where-Object { $_.Status -eq "FAILED" }
if ($failed.Count -eq 0) {
    Write-Host "All scans completed successfully!" -ForegroundColor Green
} else {
    Write-Host "$($failed.Count) service(s) failed. Check output above." -ForegroundColor Red
}

Write-Host ""
Write-Host "View results at: http://localhost:9010/projects" -ForegroundColor Cyan
Write-Host ""

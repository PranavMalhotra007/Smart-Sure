##############################################################
#  SmartSure — Redeploy a single service after code changes
#
#  Usage:
#    .\deploy\redeploy.ps1 -Service auth-service
#    .\deploy\redeploy.ps1 -Service frontend
##############################################################

param(
    [Parameter(Mandatory)][string]$Service
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }

# ── Load state ────────────────────────────────────────────────────────────────
$state    = Get-Content ".\deploy\deploy_state.json" | ConvertFrom-Json
$PublicIp = $state.PublicIp
$KeyFile  = $state.KeyFile
$ECR_BASE = $state.ECR_BASE
$Region   = $state.Region

$ServiceMap = @{
    "config-server"    = "./config-server-smart-sure"
    "service-registry" = "./ServiceRegistrySmartSure"
    "api-gateway"      = "./ApiGatewaySmartSure"
    "auth-service"     = "./AuthService"
    "policy-service"   = "./PolicyService"
    "claim-service"    = "./claimService"
    "admin-service"    = "./adminService"
    "payment-service"  = "./paymentService"
    "frontend"         = "./frontend"
}

if (-not $ServiceMap.ContainsKey($Service)) {
    Write-Fail "Unknown service '$Service'. Valid: $($ServiceMap.Keys -join ', ')"
}

$context = $ServiceMap[$Service]
$tag     = "$ECR_BASE/smartsure/$Service`:latest"
$sshOpts = "-o StrictHostKeyChecking=no -i `"$KeyFile`""
$sshHost = "ec2-user@$PublicIp"

Write-Step "Redeploying: $Service"

# Build
Write-Host "  Building..." -ForegroundColor Yellow
docker build -t $tag $context
if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed" }
Write-OK "Built"

# Authenticate to ECR
$loginPwd = aws ecr get-login-password --region $Region
$loginPwd | docker login --username AWS --password-stdin $ECR_BASE

# Push
Write-Host "  Pushing to ECR..." -ForegroundColor Yellow
docker push $tag
if ($LASTEXITCODE -ne 0) { Write-Fail "Push failed" }
Write-OK "Pushed"

# Pull on EC2 and restart
Write-Host "  Restarting on EC2..." -ForegroundColor Yellow
$cmd = "aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ECR_BASE && cd /home/ec2-user && docker-compose pull $Service && docker-compose up -d $Service"
ssh $sshOpts.Split(" ") $sshHost $cmd
if ($LASTEXITCODE -ne 0) { Write-Fail "Restart on EC2 failed" }

Write-OK "Service '$Service' redeployed successfully!"

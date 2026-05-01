##############################################################
#  SmartSure — AWS Deployment Script
#  Run this from your project root:
#    cd "d:\Spring Implementation\New folder\Smart Sure"
#    .\deploy\1_build_and_push.ps1
##############################################################

param(
    [string]$Region    = "ap-south-1",
    [string]$AccountId = "",         # Will be auto-detected if empty
    [switch]$SkipBuild = $false      # Use -SkipBuild to push existing local images
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Color helpers ─────────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  ℹ  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
Write-Step "Pre-flight checks"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker not found. Please start Docker Desktop."
}
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker daemon is not running. Start Docker Desktop first." }
Write-OK "Docker is running"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Fail "AWS CLI not found. Install it from https://aws.amazon.com/cli/ then run this script again."
}
Write-OK "AWS CLI found"

# ── Detect AWS Account ID ─────────────────────────────────────────────────────
if ($AccountId -eq "") {
    Write-Info "Detecting AWS Account ID..."
    $AccountId = aws sts get-caller-identity --query "Account" --output text
    if ($LASTEXITCODE -ne 0) { Write-Fail "AWS credentials not configured. Run: aws configure" }
}
$ECR_BASE = "$AccountId.dkr.ecr.$Region.amazonaws.com"
Write-OK "Account ID : $AccountId"
Write-OK "Region     : $Region"
Write-OK "ECR Base   : $ECR_BASE"

# ── Service map: ECR name → local build context ───────────────────────────────
$Services = [ordered]@{
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

# ── Step 1: Create ECR repositories (safe to run multiple times) ──────────────
Write-Step "Step 1 — Creating ECR repositories"
foreach ($svc in $Services.Keys) {
    $repoName = "smartsure/$svc"
    $exists = aws ecr describe-repositories --repository-names $repoName --region $Region 2>$null
    if ($LASTEXITCODE -ne 0) {
        aws ecr create-repository --repository-name $repoName --region $Region | Out-Null
        Write-OK "Created: $repoName"
    } else {
        Write-Info "Already exists: $repoName"
    }
}

# ── Step 2: Authenticate Docker to ECR ───────────────────────────────────────
Write-Step "Step 2 — Authenticating Docker to ECR"
$loginPwd = aws ecr get-login-password --region $Region
$loginPwd | docker login --username AWS --password-stdin $ECR_BASE
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker ECR login failed." }
Write-OK "Logged in to ECR"

# ── Step 3: Build & Push each service ────────────────────────────────────────
Write-Step "Step 3 — Building & Pushing images"
$total = $Services.Count
$i = 1
foreach ($svc in $Services.Keys) {
    $context = $Services[$svc]
    $tag     = "$ECR_BASE/smartsure/$svc`:latest"
    Write-Host "`n[$i/$total] $svc" -ForegroundColor Magenta

    if (-not $SkipBuild) {
        Write-Info "Building $tag from $context ..."
        docker build -t $tag $context
        if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed for $svc" }
        Write-OK "Built: $svc"
    }

    Write-Info "Pushing $tag ..."
    docker push $tag
    if ($LASTEXITCODE -ne 0) { Write-Fail "Push failed for $svc" }
    Write-OK "Pushed: $svc"
    $i++
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Step "All images pushed successfully!"
Write-Host "`n  ECR_BASE = $ECR_BASE" -ForegroundColor Green
Write-Host "  Next step: run .\deploy\2_launch_ec2.ps1 -AccountId $AccountId -Region $Region" -ForegroundColor Green
Write-Host ""

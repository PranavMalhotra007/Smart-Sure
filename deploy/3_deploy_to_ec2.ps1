##############################################################
#  SmartSure — Step 3: Deploy Application to EC2
#  Copies compose files to EC2 and starts all containers
#
#  Usage:
#    .\deploy\3_deploy_to_ec2.ps1
#  (reads deploy_state.json written by step 2)
##############################################################

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  ℹ  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }

# ── Load state from step 2 ────────────────────────────────────────────────────
$statePath = ".\deploy\deploy_state.json"
if (-not (Test-Path $statePath)) {
    Write-Fail "deploy_state.json not found. Run 2_launch_ec2.ps1 first."
}
$state     = Get-Content $statePath | ConvertFrom-Json
$PublicIp  = $state.PublicIp
$KeyFile   = $state.KeyFile
$ECR_BASE  = $state.ECR_BASE
$Region    = $state.Region
$AccountId = $state.AccountId

$sshOpts = "-o StrictHostKeyChecking=no -o ConnectTimeout=10 -i `"$KeyFile`""
$sshHost = "ec2-user@$PublicIp"

Write-Host "`n🚀 SmartSure Deploy to EC2" -ForegroundColor Green
Write-Host "   Host : $PublicIp" -ForegroundColor Yellow
Write-Host "   Key  : $KeyFile"  -ForegroundColor Yellow

# ── Step 1: Wait for SSH to be available ──────────────────────────────────────
Write-Step "Step 1 — Waiting for SSH to become available"
$maxAttempts = 30
for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
        $result = ssh $sshOpts.Split(" ") $sshHost "echo SSH_READY" 2>$null
        if ($result -eq "SSH_READY") {
            Write-OK "SSH is available"
            break
        }
    } catch {}
    Write-Info "Attempt $attempt/$maxAttempts — waiting 10s..."
    Start-Sleep -Seconds 10
    if ($attempt -eq $maxAttempts) { Write-Fail "SSH timed out after $maxAttempts attempts." }
}

# ── Step 2: Wait for user-data bootstrap to complete ─────────────────────────
Write-Step "Step 2 — Waiting for EC2 bootstrap (Docker install) to complete"
$maxWait = 40
for ($attempt = 1; $attempt -le $maxWait; $attempt++) {
    $done = ssh $sshOpts.Split(" ") $sshHost "test -f /home/ec2-user/setup_done.txt && echo DONE || echo WAIT" 2>$null
    if ($done -eq "DONE") {
        Write-OK "EC2 bootstrap complete"
        break
    }
    Write-Info "Attempt $attempt/$maxWait — still bootstrapping... (10s wait)"
    Start-Sleep -Seconds 10
    if ($attempt -eq $maxWait) { Write-Fail "Bootstrap timed out." }
}

# ── Step 3: Copy deployment files to EC2 ─────────────────────────────────────
Write-Step "Step 3 — Copying deployment files to EC2"

scp $sshOpts.Split(" ") ".\deploy\docker-compose.prod.yml" "$($sshHost):/home/ec2-user/docker-compose.yml"
Write-OK "Copied docker-compose.yml"

scp $sshOpts.Split(" ") ".\deploy\prometheus.yml" "$($sshHost):/home/ec2-user/prometheus.yml"
Write-OK "Copied prometheus.yml"

# ── Step 4: Re-authenticate ECR and pull images ───────────────────────────────
Write-Step "Step 4 — Pulling images from ECR on EC2"
$pullCmd = @"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ECR_BASE
cd /home/ec2-user
docker-compose --env-file .env pull
"@
ssh $sshOpts.Split(" ") $sshHost $pullCmd
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker pull failed on EC2." }
Write-OK "All images pulled"

# ── Step 5: Start all containers ──────────────────────────────────────────────
Write-Step "Step 5 — Starting all containers"
$startCmd = @"
cd /home/ec2-user
docker-compose --env-file .env up -d
"@
ssh $sshOpts.Split(" ") $sshHost $startCmd
if ($LASTEXITCODE -ne 0) { Write-Fail "docker-compose up failed." }
Write-OK "All containers started"

# ── Step 6: Show status ───────────────────────────────────────────────────────
Write-Step "Step 6 — Container Status"
$statusCmd = "cd /home/ec2-user && docker-compose ps"
ssh $sshOpts.Split(" ") $sshHost $statusCmd

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Step "🎉 Deployment Complete!"
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                   SmartSure is LIVE! 🚀                      ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Access URLs (replace with your EC2 IP):" -ForegroundColor Cyan
Write-Host "  ┌─────────────────────────────────────────────────────────────┐"
Write-Host "  │ 🌐 Frontend      → http://$PublicIp"
Write-Host "  │ 🔌 API Gateway   → http://$($PublicIp):8080"
Write-Host "  │ 📋 Eureka        → http://$($PublicIp):8761"
Write-Host "  │ 🐇 RabbitMQ      → http://$($PublicIp):15672  (guest/guest)"
Write-Host "  │ 📊 Grafana       → http://$($PublicIp):3000   (admin/...)"
Write-Host "  │ 🔍 Zipkin        → http://$($PublicIp):9411"
Write-Host "  └─────────────────────────────────────────────────────────────┘"
Write-Host ""
Write-Host "  NOTE: Some services may take 2-5 min to fully start up." -ForegroundColor Yellow
Write-Host "        Watch logs: ssh -i `"$KeyFile`" ec2-user@$PublicIp" -ForegroundColor Yellow
Write-Host "        Then run:   docker-compose logs -f" -ForegroundColor Yellow
Write-Host ""

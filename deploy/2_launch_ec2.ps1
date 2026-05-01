##############################################################
#  SmartSure — Step 2: Launch EC2 Instance
#  Run after: .\deploy\1_build_and_push.ps1
#
#  Usage:
#    .\deploy\2_launch_ec2.ps1 -AccountId "123456789012" -Region "ap-south-1"
##############################################################

param(
    [Parameter(Mandatory)][string]$AccountId,
    [string]$Region       = "ap-south-1",
    [string]$InstanceType = "t3.large",
    [string]$KeyName      = "smartsure-key"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  ℹ  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }

$ECR_BASE = "$AccountId.dkr.ecr.$Region.amazonaws.com"

# ── Step 1: Key Pair ──────────────────────────────────────────────────────────
Write-Step "Step 1 — Creating EC2 Key Pair"

$keyFile = ".\deploy\$KeyName.pem"
if (Test-Path $keyFile) {
    Write-Info "Key file already exists at $keyFile — skipping creation"
} else {
    $keyMaterial = aws ec2 create-key-pair `
        --key-name $KeyName `
        --region $Region `
        --query "KeyMaterial" `
        --output text
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Key pair may already exist in AWS — checking..."
        $exists = aws ec2 describe-key-pairs --key-names $KeyName --region $Region 2>$null
        if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to create or find key pair '$KeyName'" }
        Write-Info "Key pair exists in AWS but .pem not found locally. You need the original .pem to SSH."
    } else {
        $keyMaterial | Out-File -Encoding ascii $keyFile
        # Fix permissions on the .pem file
        icacls $keyFile /inheritance:r /grant:r "$($env:USERNAME):R" | Out-Null
        Write-OK "Key pair saved to $keyFile"
    }
}

# ── Step 2: Security Group ────────────────────────────────────────────────────
Write-Step "Step 2 — Creating Security Group"

$sgName = "smartsure-sg"
$sgId = aws ec2 describe-security-groups `
    --filters "Name=group-name,Values=$sgName" `
    --region $Region `
    --query "SecurityGroups[0].GroupId" `
    --output text 2>$null

if ($sgId -eq "None" -or $sgId -eq "" -or $LASTEXITCODE -ne 0) {
    $sgId = aws ec2 create-security-group `
        --group-name $sgName `
        --description "SmartSure Application Security Group" `
        --region $Region `
        --query "GroupId" `
        --output text
    Write-OK "Created Security Group: $sgId"

    # Open all required ports
    $ports = @(22, 80, 443, 8080, 8761, 9411, 15672, 9090, 3000)
    foreach ($port in $ports) {
        aws ec2 authorize-security-group-ingress `
            --group-id $sgId `
            --protocol tcp `
            --port $port `
            --cidr "0.0.0.0/0" `
            --region $Region | Out-Null
    }
    Write-OK "Opened ports: $($ports -join ', ')"
} else {
    Write-Info "Security group already exists: $sgId"
}

# ── Step 3: Get Latest Amazon Linux 2023 AMI ─────────────────────────────────
Write-Step "Step 3 — Finding latest Amazon Linux 2023 AMI"
$amiId = aws ec2 describe-images `
    --owners amazon `
    --filters "Name=name,Values=al2023-ami-2023.*-x86_64" `
              "Name=state,Values=available" `
    --query "sort_by(Images, &CreationDate)[-1].ImageId" `
    --region $Region `
    --output text
Write-OK "AMI: $amiId"

# ── Step 4: Create IAM Role for EC2 (ECR pull access) ────────────────────────
Write-Step "Step 4 — Creating IAM Role for EC2"

$roleName   = "SmartSureEC2Role"
$profileName = "SmartSureEC2Profile"

$roleExists = aws iam get-role --role-name $roleName 2>$null
if ($LASTEXITCODE -ne 0) {
    $trustPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    aws iam create-role `
        --role-name $roleName `
        --assume-role-policy-document $trustPolicy | Out-Null
    aws iam attach-role-policy `
        --role-name $roleName `
        --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly" | Out-Null
    Write-OK "Created IAM role: $roleName"

    aws iam create-instance-profile --instance-profile-name $profileName | Out-Null
    aws iam add-role-to-instance-profile `
        --instance-profile-name $profileName `
        --role-name $roleName | Out-Null
    Write-Info "Waiting 10s for IAM to propagate..."
    Start-Sleep -Seconds 10
} else {
    Write-Info "IAM role already exists: $roleName"
}

# ── Step 5: User-data script (runs on first boot) ─────────────────────────────
Write-Step "Step 5 — Preparing EC2 User Data"

$userData = @"
#!/bin/bash
set -e

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Docker Compose v2
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install AWS CLI v2
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# Login to ECR (using instance role)
REGION=$Region
ECR_BASE=$ECR_BASE
aws ecr get-login-password --region \$REGION | docker login --username AWS --password-stdin \$ECR_BASE

# Write .env file
cat > /home/ec2-user/.env << 'ENVEOF'
ECR_BASE=$ECR_BASE
MYSQL_ROOT_PASSWORD=SmartSure@2024Secure
RABBITMQ_USER=smartsure
RABBITMQ_PASS=SmartSure@Rabbit2024
GRAFANA_PASSWORD=SmartSure@Grafana
ENVEOF
chown ec2-user:ec2-user /home/ec2-user/.env

# Copy docker-compose and prometheus config
mkdir -p /home/ec2-user/smartsure

# Signal that setup is complete
echo "SMARTSURE_SETUP_DONE" > /home/ec2-user/setup_done.txt
echo "Setup complete at \$(date)" >> /home/ec2-user/setup_done.txt
"@

$userDataB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userData))

# ── Step 6: Launch EC2 Instance ───────────────────────────────────────────────
Write-Step "Step 6 — Launching EC2 Instance"

$instanceId = aws ec2 run-instances `
    --image-id $amiId `
    --instance-type $InstanceType `
    --key-name $KeyName `
    --security-group-ids $sgId `
    --iam-instance-profile "Name=$profileName" `
    --user-data $userDataB64 `
    --region $Region `
    --count 1 `
    --block-device-mappings "[{`"DeviceName`":`"/dev/xvda`",`"Ebs`":{`"VolumeSize`":30,`"VolumeType`":`"gp3`"}}]" `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=SmartSure-Production}]" `
    --query "Instances[0].InstanceId" `
    --output text

Write-OK "Instance launched: $instanceId"

# ── Step 7: Wait for instance to be running ───────────────────────────────────
Write-Step "Step 7 — Waiting for instance to start (this takes ~1-2 min)"
aws ec2 wait instance-running --instance-ids $instanceId --region $Region
Write-OK "Instance is running"

$publicIp = aws ec2 describe-instances `
    --instance-ids $instanceId `
    --region $Region `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text

# ── Save state for next scripts ───────────────────────────────────────────────
@{
    AccountId  = $AccountId
    Region     = $Region
    ECR_BASE   = $ECR_BASE
    InstanceId = $instanceId
    PublicIp   = $publicIp
    KeyFile    = $keyFile
    SgId       = $sgId
} | ConvertTo-Json | Out-File ".\deploy\deploy_state.json"

Write-Step "EC2 Instance Ready!"
Write-Host ""
Write-Host "  Instance ID : $instanceId" -ForegroundColor Green
Write-Host "  Public IP   : $publicIp"   -ForegroundColor Green
Write-Host "  Key File    : $keyFile"    -ForegroundColor Green
Write-Host ""
Write-Host "  Next step → Run: .\deploy\3_deploy_to_ec2.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "  NOTE: The EC2 instance is still installing Docker (~2 min)." -ForegroundColor Yellow
Write-Host "        Script 3 will wait for it automatically." -ForegroundColor Yellow
Write-Host ""

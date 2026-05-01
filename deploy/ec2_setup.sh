#!/bin/bash
##############################################################
#  SmartSure EC2 Bootstrap Script — Ubuntu 24.04/26.04
#  Run ONCE on fresh EC2 as ubuntu user:
#
#    ssh -i SmartSure.pem ubuntu@51.20.26.214
#    curl -fsSL https://raw.githubusercontent.com/PranavMalhotra007/Smart-Sure/main/deploy/ec2_setup.sh | bash
#  OR upload and run: bash ec2_setup.sh
##############################################################

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
info() { echo -e "  ${YELLOW}ℹ  $1${NC}"; }

step "System Update"
sudo apt-get update -y && sudo apt-get upgrade -y
ok "System updated"

step "Installing Docker (official repo)"
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
ok "Docker installed"
docker --version

step "Installing AWS CLI v2"
sudo apt-get install -y unzip curl
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install --update
rm -rf /tmp/awscliv2.zip /tmp/aws
aws --version
ok "AWS CLI installed"

step "Creating deployment directory"
mkdir -p /home/ubuntu/smartsure
ok "Directory: /home/ubuntu/smartsure"

step "Enabling Docker on system boot"
sudo systemctl enable docker
ok "Docker will auto-start on reboot"

step "Setup complete — Verification"
echo ""
echo "  Docker    : $(docker --version)"
echo "  Compose   : $(docker compose version)"
echo "  AWS CLI   : $(aws --version)"
echo "  Public IP : $(curl -s ifconfig.me 2>/dev/null)"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅  EC2 is ready for SmartSure CI/CD!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  NOTE: Log out and SSH back in for Docker group to take effect."
echo ""
echo "  Next: Add these as GitHub Secrets in your repo"
echo "  (Settings → Secrets and variables → Actions → New repository secret)"
echo ""
echo "  Secret: EC2_HOST           = $(curl -s ifconfig.me 2>/dev/null)"
echo "  Secret: EC2_SSH_KEY        = <full contents of SmartSure.pem>"
echo "  Secret: AWS_REGION         = eu-north-1  (or your region)"
echo "  Secret: AWS_ACCOUNT_ID     = <12-digit ID from AWS Console>"
echo "  Secret: AWS_ACCESS_KEY_ID  = <from IAM>"
echo "  Secret: AWS_SECRET_ACCESS_KEY = <from IAM>"
echo "  Secret: MYSQL_ROOT_PASSWORD   = SmartSure@DB2024"
echo "  Secret: RABBITMQ_USER         = smartsure"
echo "  Secret: RABBITMQ_PASS         = SmartSure@Rabbit2024"
echo "  Secret: GRAFANA_PASSWORD      = SmartSure@Grafana2024"
echo ""

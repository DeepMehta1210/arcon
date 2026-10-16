#!/bin/bash
set -e

echo "=== Bootstrapping Arcon Production EC2 Host ==="

# 1. Update system packages
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Git, curl, and essential tools
sudo apt-get install -y git curl ca-certificates gnupg lsb-release

# 3. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker ubuntu
fi

# 4. Install AWS SSM Agent (if not present)
if ! systemctl is-active --quiet snap.amazon-ssm-agent.amazon-ssm-agent; then
    sudo snap install amazon-ssm-agent --classic || sudo apt-get install -y amazon-ssm-agent
    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent
fi

# 5. Create deployment directory
sudo mkdir -p /opt/arcon
sudo chown -R ubuntu:ubuntu /opt/arcon

echo "=== EC2 Host Setup Complete. Ready for CI/CD Deployment ==="

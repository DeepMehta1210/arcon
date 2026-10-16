#!/bin/bash
set -ex

# 1. Update OS packages
apt-get update -y
apt-get upgrade -y
apt-get install -y git curl ca-certificates gnupg lsb-release

# 2. Install Docker & Docker Compose
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu

# 3. Ensure AWS SSM Agent is active
if ! systemctl is-active --quiet snap.amazon-ssm-agent.amazon-ssm-agent; then
    snap install amazon-ssm-agent --classic || apt-get install -y amazon-ssm-agent
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
fi

# 4. Clone Arcon repository
mkdir -p /opt/arcon
git clone https://github.com/DeepMehta1210/arcon.git /opt/arcon || true
chown -R ubuntu:ubuntu /opt/arcon

cd /opt/arcon

# 5. Populate production environment
cat <<EOF > /opt/arcon/.env
NODE_ENV=production
PORT=3030
JWT_SECRET=${jwt_secret}
ADMIN_PASSWORD=${admin_password}
POSTGRES_USER=postgres
POSTGRES_PASSWORD=arcon_secure_db_pass_2026
POSTGRES_DB=arcon
DATABASE_URL=postgresql://postgres:arcon_secure_db_pass_2026@postgres:5432/arcon
REDIS_URL=redis://redis:6379
EOF

# 6. Build and launch services via Docker Compose
docker compose up -d --build

echo "=== Arcon Cloud-Init Completed Successfully ==="

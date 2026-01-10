#!/bin/bash
# ============================================================
# ChatLingua Server Setup Script
# Run as root on fresh Ubuntu/Debian server
# ============================================================

set -e

echo "=========================================="
echo "ChatLingua Server Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./setup-server.sh"
    exit 1
fi

echo "Step 1: Updating system..."
apt update && apt upgrade -y

echo ""
echo "Step 2: Installing required packages..."
apt install -y curl git htop nano ufw

echo ""
echo "Step 3: Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "Firewall status:"
ufw status

echo ""
echo "Step 4: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker already installed"
fi

echo ""
echo "Step 5: Installing Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    apt install -y docker-compose-plugin
else
    echo "Docker Compose already installed"
fi

echo ""
echo "Step 6: Creating app directory..."
mkdir -p /opt/chatlingua
mkdir -p /opt/chatlingua/certbot/conf
mkdir -p /opt/chatlingua/certbot/www
mkdir -p /opt/chatlingua/database/init

echo ""
echo "Step 7: Verifying installations..."
echo "Docker version:"
docker --version
echo "Docker Compose version:"
docker compose version

echo ""
echo "=========================================="
echo "Server Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy project files to /opt/chatlingua/"
echo "2. Copy .env.production.example to .env and configure"
echo "3. Configure DNS records for your domain"
echo "4. Run: ./scripts/init-ssl.sh to get SSL certificate"
echo "5. Run: ./scripts/deploy.sh to deploy the application"
echo ""

#!/bin/bash
# ============================================================
# ChatLingua: Upload Files to Production Server
# Run from local machine (Git Bash on Windows or Linux/Mac)
# ============================================================

set -e

SERVER_IP="157.10.53.20"
SERVER_USER="root"
SERVER_PATH="/opt/chatlingua"

echo "=========================================="
echo "ChatLingua: Upload to Production Server"
echo "=========================================="
echo ""
echo "Server: ${SERVER_USER}@${SERVER_IP}"
echo "Path: ${SERVER_PATH}"
echo ""

# Files and folders to upload
FILES=(
    "packages"
    "database"
    "nginx"
    "scripts"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "docker-compose.prod.yml"
    "Dockerfile.backend"
    "Dockerfile.frontend"
    ".env.production.example"
)

echo "Creating server directory..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${SERVER_PATH}"

echo ""
echo "Uploading files..."

for file in "${FILES[@]}"; do
    if [ -e "$file" ]; then
        echo "  Uploading: $file"
        scp -r "$file" ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/
    else
        echo "  Skipping (not found): $file"
    fi
done

echo ""
echo "Setting permissions..."
ssh ${SERVER_USER}@${SERVER_IP} "chmod +x ${SERVER_PATH}/scripts/*.sh"

echo ""
echo "=========================================="
echo "Upload Complete!"
echo "=========================================="
echo ""
echo "Next steps on server:"
echo "  1. ssh ${SERVER_USER}@${SERVER_IP}"
echo "  2. cd ${SERVER_PATH}"
echo "  3. cp .env.production.example .env"
echo "  4. nano .env  # Configure environment variables"
echo "  5. ./scripts/setup-server.sh  # First time only"
echo "  6. ./scripts/init-ssl.sh      # Get SSL certificate"
echo "  7. ./scripts/deploy.sh        # Deploy application"
echo ""

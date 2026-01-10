#!/bin/bash
# ============================================================
# ChatLingua SSL Certificate Setup Script
# Run after DNS is configured and before first deploy
# ============================================================

set -e

cd /opt/chatlingua

# Load environment
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi
source .env

DOMAIN="${DOMAIN:-chatlingua.online}"
EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"

echo "=========================================="
echo "ChatLingua SSL Certificate Setup"
echo "=========================================="
echo ""
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo ""

# Create directories
mkdir -p certbot/conf certbot/www

# Create temporary nginx config for SSL challenge
echo "Step 1: Creating temporary nginx config..."
mkdir -p nginx/conf.d

cat > nginx/conf.d/chatlingua.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name chatlingua.online www.chatlingua.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'ChatLingua SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

echo ""
echo "Step 2: Starting nginx for SSL challenge..."
docker compose -f docker-compose.prod.yml up -d nginx

echo ""
echo "Step 3: Waiting for nginx to start..."
sleep 5

echo ""
echo "Step 4: Requesting SSL certificate..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN} \
    -d www.${DOMAIN}

echo ""
echo "Step 5: Restoring full nginx config..."
cat > nginx/conf.d/chatlingua.conf << 'EOFCONF'
# Upstream servers
upstream backend {
    server backend:3000;
    keepalive 32;
}

upstream frontend {
    server frontend:4000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name chatlingua.online www.chatlingua.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name chatlingua.online www.chatlingua.online;

    ssl_certificate /etc/letsencrypt/live/chatlingua.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chatlingua.online/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOFCONF

echo ""
echo "Step 6: Stopping temporary nginx..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "=========================================="
echo "SSL Certificate Setup Complete!"
echo "=========================================="
echo ""
echo "Certificate location: /opt/chatlingua/certbot/conf/live/${DOMAIN}/"
echo ""
echo "Next: Run ./scripts/deploy.sh to deploy the full application"
echo ""

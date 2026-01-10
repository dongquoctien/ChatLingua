#!/bin/bash
# ============================================================
# ChatLingua Production Deployment Script
#
# Usage:
#   ./scripts/deploy.sh          # Build locally
#   ./scripts/deploy.sh --pull   # Pull from GHCR (CI/CD mode)
# ============================================================

set -e

cd /opt/chatlingua

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.production.example to .env and configure it."
    exit 1
fi

# Load environment
source .env

echo "=========================================="
echo "ChatLingua Production Deployment"
echo "=========================================="
echo ""

# Check deployment mode
if [ "$1" == "--pull" ]; then
    echo "Mode: Pull from GitHub Container Registry"
    COMPOSE_FILE="docker-compose.prod.ghcr.yml"

    # Login to GHCR
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
    fi

    echo ""
    echo "Step 1: Pulling latest images..."
    docker compose -f $COMPOSE_FILE pull backend frontend
else
    echo "Mode: Build locally"
    COMPOSE_FILE="docker-compose.prod.yml"

    echo ""
    echo "Step 1: Building Docker images..."
    docker compose -f $COMPOSE_FILE build --no-cache
fi

echo ""
echo "Step 2: Stopping old containers..."
docker compose -f $COMPOSE_FILE down

echo ""
echo "Step 3: Starting new containers..."
docker compose -f $COMPOSE_FILE up -d

echo ""
echo "Step 4: Waiting for services to start..."
sleep 15

echo ""
echo "Step 5: Health check..."
docker compose -f $COMPOSE_FILE ps

# Check API health
echo ""
echo "Step 6: Verifying services..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 2>/dev/null || echo "000")

echo "  API: HTTP $API_STATUS"
echo "  Frontend: HTTP $FRONT_STATUS"

if [ "$API_STATUS" != "200" ] || [ "$FRONT_STATUS" != "200" ]; then
    echo ""
    echo "⚠️  Warning: Some services may not be healthy yet."
    echo "Check logs with: docker compose -f $COMPOSE_FILE logs -f"
fi

echo ""
echo "Step 7: Cleanup old images..."
docker image prune -f

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Website: https://chatlingua.online"
echo "API: https://chatlingua.online/api"
echo ""
echo "Useful commands:"
echo "  View logs:  docker compose -f $COMPOSE_FILE logs -f"
echo "  Restart:    docker compose -f $COMPOSE_FILE restart"
echo "  Stop:       docker compose -f $COMPOSE_FILE down"
echo ""

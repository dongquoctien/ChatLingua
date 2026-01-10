#!/bin/bash
# ============================================================
# ChatLingua Health Check Script
# Run: ./scripts/healthcheck.sh
# ============================================================

cd /opt/chatlingua

echo "=== ChatLingua Health Check ==="
echo "Time: $(date)"
echo ""

# Check containers
echo "--- Container Status ---"
docker compose -f docker-compose.prod.yml ps
echo ""

# Check disk space
echo "--- Disk Usage ---"
df -h / | tail -1
echo ""

# Check memory
echo "--- Memory Usage ---"
free -h | head -2
echo ""

# Check CPU
echo "--- CPU Load ---"
uptime
echo ""

# Check API health
echo "--- API Health ---"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "API: OK (HTTP $API_STATUS)"
else
    echo "API: FAILED (HTTP $API_STATUS)"
fi

# Check frontend
echo "--- Frontend Health ---"
FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 2>/dev/null || echo "000")
if [ "$FRONT_STATUS" = "200" ]; then
    echo "Frontend: OK (HTTP $FRONT_STATUS)"
else
    echo "Frontend: FAILED (HTTP $FRONT_STATUS)"
fi

# Check MySQL
echo "--- Database Health ---"
DB_STATUS=$(docker exec chatlingua-mysql mysqladmin -u chatlingua -p${MYSQL_PASSWORD} ping 2>/dev/null || echo "failed")
if [[ "$DB_STATUS" == *"alive"* ]]; then
    echo "MySQL: OK"
else
    echo "MySQL: FAILED"
fi

echo ""
echo "=== End Health Check ==="

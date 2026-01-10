#!/bin/bash
# ============================================================
# ChatLingua Database Backup Script
# Run: ./scripts/backup.sh
# ============================================================

set -e

cd /opt/chatlingua

# Load environment
source .env

BACKUP_DIR="/opt/chatlingua/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Creating backup: $DATE"

# Backup database
docker exec chatlingua-mysql mysqldump \
    -u chatlingua \
    -p${MYSQL_PASSWORD} \
    --single-transaction \
    --routines \
    --triggers \
    chatlingua > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

FILE_SIZE=$(ls -lh $BACKUP_DIR/db_$DATE.sql.gz | awk '{print $5}')
echo "Backup created: $BACKUP_DIR/db_$DATE.sql.gz ($FILE_SIZE)"

# Keep only last 7 days of backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

# List remaining backups
echo ""
echo "Current backups:"
ls -lh $BACKUP_DIR/db_*.sql.gz 2>/dev/null || echo "No backups found"

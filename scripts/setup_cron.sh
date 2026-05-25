#!/bin/bash

# Cron Setup Script for CMS SaaS
# Sets up scheduled maintenance tasks

set -e

# Default values
SCRIPT_DIR="$(pwd)/scripts"
LOG_DIR="$(pwd)/logs"
BACKUP_DIR="$(pwd)/backups"

# Create directories
mkdir -p "${LOG_DIR}"
mkdir -p "${BACKUP_DIR}"

# Generate cron entries
CRON_ENTRIES="# CMS SaaS Maintenance Schedule

# Daily backup at 2 AM
0 2 * * * ${SCRIPT_DIR}/backup_db.sh >> ${LOG_DIR}/backup.log 2>&1

# Weekly maintenance every Sunday at 3 AM
0 3 * * 0 ${SCRIPT_DIR}/database_maintenance.sh >> ${LOG_DIR}/maintenance.log 2>&1

# Cleanup old backups and logs (keep 30 days) every Sunday at 4 AM
0 4 * * 0 find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
0 4 * * 0 find ${LOG_DIR} -name "*.log" -mtime +30 -delete

# Health check every hour
0 * * * * curl -f http://localhost:8000/health >> ${LOG_DIR}/health.log 2>&1 || echo "Health check failed at $(date)" >> ${LOG_DIR}/health_errors.log
"

# Display cron entries
echo "Generated cron entries:"
echo "======================="
echo -e "${CRON_ENTRIES}"

# Instructions for setup
echo ""
echo "To set up scheduled maintenance:"
echo "1. Edit your crontab: crontab -e"
echo "2. Add the entries above"
echo "3. Save and exit"
echo ""
echo "For system-wide setup, add to /etc/crontab"
echo ""
echo "Note: Make sure the scripts are executable:"
echo "  chmod +x ${SCRIPT_DIR}/*.sh"
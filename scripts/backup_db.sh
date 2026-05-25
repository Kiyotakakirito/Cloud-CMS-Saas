#!/bin/bash

# Database Backup Script for CMS SaaS
# Usage: ./scripts/backup_db.sh [database_url]

set -e

# Default values
DEFAULT_DB_URL="postgresql://postgres:postgres@localhost:5432/cms_db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Parse database URL from argument or use default
if [ $# -eq 1 ]; then
    DB_URL="$1"
else
    DB_URL="${DEFAULT_DB_URL}"
fi

# Extract database components from URL
DB_NAME=$(echo "${DB_URL}" | sed -n 's/.*\/\/\([^@]*@\)\?[^\/]*\/\([^?]*\).*/\2/p')
DB_HOST=$(echo "${DB_URL}" | sed -n 's/.*@\([^:/]*\).*/\1/p')
DB_PORT=$(echo "${DB_URL}" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "${DB_URL}" | sed -n 's/.*:\/\/\([^:]*\):\([^@]*\)@.*/\1/p')
DB_PASS=$(echo "${DB_URL}" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Set defaults if not parsed
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup filename
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

echo "Starting backup of database: ${DB_NAME}"
echo "Host: ${DB_HOST}, Port: ${DB_PORT}"

# Perform backup using pg_dump
if [ -n "${DB_PASS}" ]; then
    export PGPASSWORD="${DB_PASS}"
    pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
    unset PGPASSWORD
else
    pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"
fi

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}"
    echo "Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"

    # Clean up old backups
    echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

    # List remaining backups
    echo "Current backups:"
    ls -la "${BACKUP_DIR}/"*.sql.gz 2>/dev/null || echo "No backups found"

else
    echo "Backup failed!"
    exit 1
fi
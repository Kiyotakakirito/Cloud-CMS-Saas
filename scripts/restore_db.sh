#!/bin/bash

# Database Restore Script for CMS SaaS
# Usage: ./scripts/restore_db.sh [backup_file] [database_url]

set -e

# Default values
DEFAULT_DB_URL="postgresql://postgres:postgres@localhost:5432/cms_db"
BACKUP_DIR="./backups"

# Parse arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 [backup_file] [database_url]"
    echo "Available backups:"
    ls -la "${BACKUP_DIR}/"*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
if [ $# -eq 2 ]; then
    DB_URL="$2"
else
    DB_URL="${DEFAULT_DB_URL}"
fi

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Backup file not found: ${BACKUP_FILE}"
    echo "Available backups:"
    ls -la "${BACKUP_DIR}/"*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

# Extract database components from URL
DB_NAME=$(echo "${DB_URL}" | sed -n 's/.*\/\/\([^@]*@\)\?[^\/]*\/\([^?]*\).*/\2/p')
DB_HOST=$(echo "${DB_URL}" | sed -n 's/.*@\([^:/]*\).*/\1/p')
DB_PORT=$(echo "${DB_URL}" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "${DB_URL}" | sed -n 's/\/\/\([^:]*\):\([^@]*\)@.*/\1/p')
DB_PASS=$(echo "${DB_URL}" | sed -n 's/\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Set defaults if not parsed
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

echo "Restoring database: ${DB_NAME}"
echo "From backup: ${BACKUP_FILE}"
echo "Host: ${DB_HOST}, Port: ${DB_PORT}"

# Confirm restoration
read -p "This will OVERWRITE the database ${DB_NAME}. Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restoration cancelled."
    exit 1
fi

# Drop and recreate database
echo "Recreating database..."
if [ -n "${DB_PASS}" ]; then
    export PGPASSWORD="${DB_PASS}"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -c "DROP DATABASE IF EXISTS ${DB_NAME};" postgres
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -c "CREATE DATABASE ${DB_NAME};" postgres
    unset PGPASSWORD
else
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -c "DROP DATABASE IF EXISTS ${DB_NAME};" postgres
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -c "CREATE DATABASE ${DB_NAME};" postgres
fi

# Restore from backup
echo "Restoring data..."
if [ -n "${DB_PASS}" ]; then
    export PGPASSWORD="${DB_PASS}"
    gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"
    unset PGPASSWORD
else
    gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${DB_NAME}"
fi

echo "Restoration completed successfully!"
echo "Database ${DB_NAME} has been restored from ${BACKUP_FILE}"
#!/bin/bash

# Database Maintenance Script for CMS SaaS
# Performs routine database maintenance tasks

set -e

# Default values
DEFAULT_DB_URL="postgresql://postgres:postgres@localhost:5432/cms_db"
LOG_DIR="./logs"
BACKUP_DIR="./backups"

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
DB_USER=$(echo "${DB_URL}" | sed -n 's/\/\/\([^:]*\):\([^@]*\)@.*/\1/p')
DB_PASS=$(echo "${DB_URL}" | sed -n 's/\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Set defaults if not parsed
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

# Create directories
mkdir -p "${LOG_DIR}"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/maintenance_${TIMESTAMP}.log"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "${LOG_FILE}"
}

# Execute SQL function
execute_sql() {
    local sql="$1"
    local description="$2"

    log "Starting: ${description}"

    if [ -n "${DB_PASS}" ]; then
        export PGPASSWORD="${DB_PASS}"
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "${sql}" >> "${LOG_FILE}" 2>&1
        unset PGPASSWORD
    else
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "${sql}" >> "${LOG_FILE}" 2>&1
    fi

    log "Completed: ${description}"
}

# Main maintenance routine
log "Starting database maintenance for ${DB_NAME}"

# 1. Vacuum and analyze
execute_sql "VACUUM ANALYZE;" "Vacuum and analyze database"

# 2. Update statistics
execute_sql "ANALYZE;" "Update database statistics"

# 3. Check for bloat
execute_sql "
SELECT
    schemaname,
    tablename,
    ROUND((bloat_ratio * 100)::numeric, 2) AS bloat_percent,
    ROUND(bloat_size::numeric / 1024 / 1024, 2) AS bloat_size_mb
FROM (
    SELECT
        schemaname,
        tablename,
        (n_dead_tup::numeric / (n_live_tup + n_dead_tup)) AS bloat_ratio,
        pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename) AS bloat_size
    FROM pg_stat_user_tables
    WHERE n_live_tup + n_dead_tup > 0
) AS bloat_info
WHERE bloat_ratio > 0.1
ORDER BY bloat_size DESC;
" "Check for table bloat"

# 4. Check index usage
execute_sql "
SELECT
    schemaname,
    relname,
    indexrelname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
" "Check unused indexes"

# 5. Check long-running queries
execute_sql "
SELECT
    pid,
    now() - query_start as duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 minutes'
ORDER BY duration DESC;
" "Check long-running queries"

# 6. Backup the database
log "Starting database backup"
./scripts/backup_db.sh "${DB_URL}" >> "${LOG_FILE}" 2>&1
log "Database backup completed"

# 7. Clean up old logs (keep 30 days)
find "${LOG_DIR}" -name "*.log" -mtime +30 -delete

log "Database maintenance completed successfully"
log "Log file: ${LOG_FILE}"
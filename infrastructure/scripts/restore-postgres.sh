#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="hexjit-postgres"
DB_NAME="hexjit"
DB_USER="hexjit"

if [ "$#" -ne 1 ]; then
  echo "Usage:"
  echo "./restore-postgres.sh /path/to/backup.dump"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found:"
  echo "$BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace the current database contents."
read -r -p "Type RESTORE to continue: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Restoring PostgreSQL database..."

docker exec "$CONTAINER_NAME" \
  pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  < "$BACKUP_FILE"

echo "Database restore completed."

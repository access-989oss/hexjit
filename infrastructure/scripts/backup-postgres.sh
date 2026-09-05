#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$HOME/hexjit"
BACKUP_DIR="$PROJECT_DIR/backups/postgres"

CONTAINER_NAME="hexjit-postgres"
DB_NAME="hexjit"
DB_USER="hexjit"

TIMESTAMP="$(date -u +"%Y-%m-%d_%H-%M-%S")"
BACKUP_FILE="$BACKUP_DIR/hexjit_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."
echo "Output: $BACKUP_FILE"

docker exec "$CONTAINER_NAME" \
  pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -Fc \
  > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file is empty."
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "Backup completed successfully."

# Keep the newest 7 local backups.
find "$BACKUP_DIR" \
  -type f \
  -name "hexjit_*.dump" \
  -printf '%T@ %p\n' |
  sort -nr |
  awk 'NR > 7 {print $2}' |
  xargs -r rm -f

echo "Old backups cleaned."
echo "Current backups:"
ls -lh "$BACKUP_DIR"

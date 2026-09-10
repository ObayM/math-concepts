#!/bin/sh
set -eu

: "${BACKUP_DIR:=/var/backups/mathly}"
: "${BACKUP_KEEP_DAYS:=30}"
: "${POSTGRES_USER:=mathly}"
: "${POSTGRES_DB:=mathly}"
: "${DB_CONTAINER:=mathly-db-1}"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="${BACKUP_DIR}/mathly-${stamp}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "dumping ${POSTGRES_DB} to ${file}"
docker exec "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$file.partial"
mv "$file.partial" "$file"

bytes=$(wc -c < "$file")
if [ "$bytes" -lt 10240 ]; then
  echo "refusing to keep a ${bytes} byte dump, something went wrong" >&2
  rm -f "$file"
  exit 1
fi
echo "wrote ${bytes} bytes"

if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "copying to ${BACKUP_REMOTE}"
  rclone copy "$file" "$BACKUP_REMOTE"
fi

echo "pruning local dumps older than ${BACKUP_KEEP_DAYS} days"
find "$BACKUP_DIR" -name 'mathly-*.sql.gz' -mtime "+${BACKUP_KEEP_DAYS}" -delete

echo "done"

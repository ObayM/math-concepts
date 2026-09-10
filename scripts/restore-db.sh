#!/bin/sh
set -eu

: "${POSTGRES_USER:=mathly}"
: "${DB_CONTAINER:=mathly-db-1}"

dump="${1:-}"
target="${2:-mathly_restore_check}"

if [ -z "$dump" ]; then
  echo "usage: scripts/restore-db.sh <dump.sql.gz> [target-database]" >&2
  echo "the default target is a scratch database, never the live one." >&2
  exit 1
fi

if [ "$target" = "mathly" ] && [ "${I_MEAN_IT:-}" != "1" ]; then
  echo "restoring over the live database needs I_MEAN_IT=1" >&2
  exit 1
fi

echo "recreating ${target}"
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$target\";" -c "CREATE DATABASE \"$target\";"

echo "restoring ${dump} into ${target}"
gunzip -c "$dump" | docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$target" -q

echo "row counts:"
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$target" -t -c \
  "select 'courses', count(*) from courses
   union all select 'lessons', count(*) from lessons
   union all select 'users', count(*) from \"user\";"

echo
echo "restored into ${target}. drop it when you are satisfied:"
echo "  docker exec ${DB_CONTAINER} psql -U ${POSTGRES_USER} -d postgres -c 'DROP DATABASE \"${target}\";'"

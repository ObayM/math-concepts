#!/bin/sh
set -e

echo "running db migrations..."
node node_modules/prisma/build/index.js migrate deploy

if [ "${SKIP_SEED}" = "1" ]; then
  echo "skipping seed (SKIP_SEED=1)"
else
  echo "seeding bootstrap content..."
  node prisma/seed.js
fi

echo "starting app..."
exec node server.js

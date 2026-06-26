#!/bin/sh
set -e

echo "running db migrations..."
node node_modules/.bin/prisma migrate deploy

echo "starting app..."
exec node server.js

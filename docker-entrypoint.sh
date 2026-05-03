#!/bin/sh

# Docker entrypoint script for production deployments
# Runs migrations and seeds database before starting the server

set -e

echo "[Docker] Starting application..."
echo "[Docker] NODE_ENV: $NODE_ENV"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "[Docker] ❌ ERROR: DATABASE_URL environment variable not set"
  exit 1
fi

echo "[Docker] Running Prisma migrations..."
npx prisma migrate deploy

echo "[Docker] Seeding database..."
npx prisma db seed

echo "[Docker] ✅ Database ready"
echo "[Docker] Starting Express server..."

# Start the server
node dist/index.js

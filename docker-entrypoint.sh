#!/bin/sh

# Docker entrypoint script for production deployments
# Runs migrations and seeds database before starting the server

echo "[Docker] Starting application..."
echo "[Docker] NODE_ENV: $NODE_ENV"
echo "[Docker] Working directory: $(pwd)"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "[Docker] ❌ ERROR: DATABASE_URL environment variable not set"
  exit 1
fi

echo "[Docker] Running Prisma migrations..."
if ! npx prisma migrate deploy; then
  echo "[Docker] ❌ ERROR: Migrations failed"
  exit 1
fi

echo "[Docker] Checking if bones.json exists..."
if [ ! -f "prisma/data/bones.json" ]; then
  echo "[Docker] ⚠️  WARNING: bones.json not found at prisma/data/bones.json"
  ls -la prisma/data/ || echo "prisma/data directory doesn't exist"
else
  echo "[Docker] ✓ Found bones.json"
fi

echo "[Docker] Seeding database..."
if ! npx prisma db seed; then
  echo "[Docker] ⚠️  WARNING: Seeding failed (continuing anyway - database schema is ready)"
fi

echo "[Docker] ✅ Database ready"
echo "[Docker] Starting Express server..."

# Start the server
exec node dist/index.js

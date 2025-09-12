#!/usr/bin/env bash
echo "==================================="
echo "XSS Hunter Express - Starting"
echo "==================================="

echo "[INFO] Payload Server: Ports 80/443 (auto-SSL)"
echo "[INFO] Admin Server: Port ${ADMIN_PORT:-8443}"
echo "[INFO] Hostname: ${HOSTNAME}"
echo "[INFO] SSL Email: ${SSL_CONTACT_EMAIL}"

# Wait for PostgreSQL to be ready
echo "[Database] Waiting for PostgreSQL to be ready..."
max_retries=30
counter=0
until node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});
client.connect()
  .then(() => { console.log('[Database] Connected successfully'); client.end(); process.exit(0); })
  .catch(() => { process.exit(1); });
" 2>/dev/null; do
  counter=$((counter+1))
  if [ $counter -gt $max_retries ]; then
    echo "[Database] ERROR: PostgreSQL did not become ready in time"
    exit 1
  fi
  echo "[Database] PostgreSQL not ready yet, retrying... ($counter/$max_retries)"
  sleep 2
done

echo "[Database] PostgreSQL is ready!"

# Create Greenlock directory structure
echo "[SSL] Creating Greenlock directory structure..."
mkdir -p /app/greenlock.d
mkdir -p /app/greenlock.d/accounts
mkdir -p /app/greenlock.d/live

echo "[SSL] Greenlock directory ready for domain: ${HOSTNAME}"

# Apply Greenlock patch to prevent it from binding to port 80
echo "[Patch] Applying Greenlock HTTPS-only patch..."
if [ -f /app/Docker/greenlock-https-only.patch ]; then
    cd /app/server-ng
    patch -p0 < /app/Docker/greenlock-https-only.patch
    echo "[Patch] Greenlock patched to only handle HTTPS (port 443)"
else
    echo "[Patch] Warning: Patch file not found, Greenlock will try to bind to port 80"
fi

echo "[INFO] Starting servers..."
cd /app/server-ng
node dual-server.js
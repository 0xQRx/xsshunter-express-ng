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

# Create Greenlock configuration directory and files
echo "[SSL] Setting up Greenlock configuration..."
mkdir -p /app/greenlock.d

# Create the greenlock.json configuration file
cat > /app/greenlock.d/greenlock.json <<EOF
{
  "manager": {
    "module": "@greenlock/manager"
  },
  "store": {
    "module": "greenlock-store-fs",
    "basePath": "/app/greenlock.d"
  }
}
EOF

# Create the site configuration
mkdir -p /app/greenlock.d/config
cat > /app/greenlock.d/config/sites.json <<EOF
{
  "sites": [
    {
      "subject": "${HOSTNAME}",
      "altnames": ["${HOSTNAME}"]
    }
  ]
}
EOF

echo "[SSL] Greenlock configured for domain: ${HOSTNAME}"

echo "[INFO] Starting servers..."
cd /app/server-ng
node dual-server.js
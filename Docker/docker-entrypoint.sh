#!/usr/bin/env bash
echo "==================================="
echo "XSS Hunter Express - Starting"
echo "==================================="

echo "[INFO] Payload Server: Ports 80/443 (auto-SSL)"
echo "[INFO] Admin Server: Port ${ADMIN_PORT:-8443}"
echo "[INFO] Hostname: ${HOSTNAME}"
echo "[INFO] SSL Email: ${SSL_CONTACT_EMAIL}"

# Create Greenlock config directory if it doesn't exist
mkdir -p /app/greenlock.d

# Create sites configuration for Greenlock if needed
if [ ! -f /app/greenlock.d/config.json ]; then
    echo "[SSL] Creating Greenlock configuration..."
    cat > /app/greenlock.d/config.json <<EOF
{
  "sites": [{
    "subject": "${HOSTNAME}",
    "altnames": ["${HOSTNAME}"]
  }]
}
EOF
fi

echo "[INFO] Starting servers..."
cd /app/server-ng
node dual-server.js
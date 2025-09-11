Summary of Changes

1. server.js - Dual-port configuration

- Development Mode: Both servers run HTTP (no certificates)
- Payload server on port 3000
- Admin panel on port 8443
- Production Mode: Both servers use HTTPS with same SSL certificate
- Payload server on ports 80/443 (auto-SSL via Greenlock)
- Admin panel on port 8443 (uses same SSL cert)

2. run-dev.sh - Updated environment variables

- Added PAYLOAD_PORT=3000 for payload server
- Added ADMIN_PORT=8443 for admin panel
- Updated console output to show both server URLs

3. docker-compose.yml - Exposed all necessary ports

- Port 80: HTTP → HTTPS redirect for payloads
- Port 443: HTTPS for payloads
- Port 8443: HTTPS for admin panel

Security Architecture

Public Access (Ports 80/443):
├── /probe.js → Serves XSS payload
├── /js_callback → Receives XSS fires
├── /background_callback → Receives background data
└── /* → All other paths serve probe.js

Restricted Access (Port 8443):
├── /admin → Vue.js admin interface
├── /api/v1/* → All API endpoints
└── Full application functionality

Firewall Configuration (just refference)

To secure the admin port, add these firewall rules:

# Allow only your IP to access admin port
iptables -A INPUT -p tcp --dport 8443 -s YOUR_IP_ADDRESS -j ACCEPT
iptables -A INPUT -p tcp --dport 8443 -j DROP

# Or using ufw (Ubuntu firewall)
ufw allow from YOUR_IP_ADDRESS to any port 8443
ufw deny 8443

This setup provides complete isolation between public payload serving and admin access, with firewall-level protection for the admin panel.
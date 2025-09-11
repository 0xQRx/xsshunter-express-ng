# Server-NG (Dual-Port Architecture)

This is the new generation dual-port server implementation for XSS Hunter Express.

## Architecture

The dual-port architecture separates public-facing payload delivery from admin functionality:

- **Port 3000** (Payload Server): Handles XSS payloads and callbacks
  - Serves probe.js payloads
  - Receives XSS fire callbacks
  - Handles page collection and background data
  - No authentication required (uses probe tokens)

- **Port 8443** (Admin Server): Handles administration and API
  - Admin panel UI
  - API endpoints
  - Screenshot serving
  - Requires authentication

## Running the Server

### Development Mode

```bash
./run-dual-dev.sh
```

This will start both servers with:
- Payload server on http://localhost:3000
- Admin server on http://localhost:8443
- Admin panel at http://localhost:8443/admin

### Production Mode

```bash
NODE_ENV=production node dual-server.js
```

## File Structure

```
server-ng/
├── dual-server.js        # Main orchestrator that starts both servers
├── payload-server/       # Public-facing payload delivery server
│   └── app.js
├── admin-server/         # Admin panel and API server
│   ├── app.js
│   └── api.js
├── shared/              # Shared resources between servers
│   ├── database.js
│   ├── constants.js
│   └── utils/
├── probe.js             # XSS probe payload
├── templates/           # HTML templates
└── run-dual-dev.sh      # Development startup script
```

## Key Differences from Original Server

1. **Security Isolation**: Admin functionality is completely isolated from public payload delivery
2. **Port Separation**: Different ports for different concerns
3. **Shared Resources**: Database and utilities are shared between servers
4. **ProbeToken Authentication**: Secure token-based authentication for callbacks

## Environment Variables

See the main project documentation for environment variable configuration. The dual-port mode requires:

```bash
DUAL_PORT_MODE=true
PAYLOAD_PORT=3000
ADMIN_PORT=8443
```
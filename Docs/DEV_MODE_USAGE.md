# Development Mode Configuration for XSS Hunter Express NG

## Overview

XSS Hunter Express NG features a dual-port architecture that separates the payload collection server from the admin panel for enhanced security and development flexibility. The `run-dual-dev.sh` script handles all setup automatically for local development.

## Architecture

- **Port 3000**: Payload server (handles XSS callbacks)
- **Port 8443**: Admin panel and API (HTTPS with self-signed cert)
- **Port 5173**: Vue 3 frontend development server (optional, with hot-reload)

## Quick Start

### Using the Development Script

```bash
# Start both servers with automatic setup
./run-dual-dev.sh

# Force rebuild the Vue 3 frontend
./run-dual-dev.sh --rebuild-frontend

# Recreate PostgreSQL database
./run-dual-dev.sh --rebuild-postgres

# Show all options
./run-dual-dev.sh --help
```

The script automatically:
- Checks for Node.js 22 (recommended)
- Starts PostgreSQL container if needed
- Builds frontend if not already built
- Sets all required environment variables
- Creates necessary directories
- Starts both payload and admin servers
- Displays the randomly generated admin password

## Node.js Version

This project is optimized for Node.js 22:

```bash
# Install Node.js 22 with nvm
nvm install 22
nvm use 22

# Verify version
node -v  # Should show v22.x.x
```

## What the Script Does

### 1. Environment Setup
The script sets all required environment variables:
- `DEV_MODE=true` - Enables development mode
- `NODE_ENV=development` - Sets Node environment
- `DUAL_PORT_MODE=true` - Enables dual-port architecture
- `PAYLOAD_PORT=3000` - Payload collection port
- `ADMIN_PORT=8443` - Admin panel port
- `HOSTNAME=localhost:3000` - Local hostname

### 2. Database Management
- Automatically starts PostgreSQL container if not running
- Can rebuild database with `--rebuild-postgres` flag
- Tests database connection before starting servers

### 3. Frontend Building
- Checks if Vue 3 frontend is built
- Automatically builds if missing
- Can force rebuild with `--rebuild-frontend` flag

### 4. Server Startup
- Starts both payload server (port 3000) and admin server (port 8443)
- Monitors both processes
- Displays admin password in console

## Access Points

- **Payload Server**: http://localhost:3000
- **Admin Panel**: https://localhost:8443/admin (accept self-signed cert)
- **XSS Probe**: http://localhost:3000/probe.js
- **Frontend Dev** (optional): http://localhost:5173 (if running `npm run dev`)

## Script Options

```bash
./run-dual-dev.sh [OPTIONS]

Options:
  --rebuild-frontend    Force rebuild the Vue 3 frontend application
  --rebuild-postgres    Drop and recreate the PostgreSQL database
  --rebuild            Legacy option (same as --rebuild-frontend)
  --help, -h           Show help message

Examples:
  ./run-dual-dev.sh                           # Normal start
  ./run-dual-dev.sh --rebuild-frontend        # Rebuild frontend and start
  ./run-dual-dev.sh --rebuild-postgres        # Reset database and start
```

## Manual Frontend Development

For Vue 3 hot-reload during development:

```bash
# Terminal 1: Run the dual-dev script
./run-dual-dev.sh

# Terminal 2: Run frontend dev server (optional)
cd front-end-vue3
npm run dev
# Access at http://localhost:5173
```

## Testing

Run the comprehensive test suite:

```bash
cd tests
./run-all-tests.sh

# Or run individual tests
node test-auth.js
node test-validation.js
node test-callback-validation.js
node test-error-production.js
node test-payload-server-errors.js
node test-session-config.js
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :8443

# Kill process if needed
kill -9 <PID>
```

### Frontend Not Loading
```bash
# Rebuild frontend
./run-dual-dev.sh --rebuild-frontend
```

### Database Connection Issues
```bash
# Reset database
./run-dual-dev.sh --rebuild-postgres
```

### Self-Signed Certificate Warning
The admin panel uses a self-signed certificate in development. Accept the browser security warning to proceed.

### Admin Password
The admin password is randomly generated and displayed in the console when starting:
```
Password: XXXXXXXXXXXXXX
```

## Environment Variables Set by Script

| Variable | Value | Description |
|----------|-------|-------------|
| `DEV_MODE` | `true` | Enables development mode |
| `NODE_ENV` | `development` | Node environment |
| `DUAL_PORT_MODE` | `true` | Dual-port architecture |
| `PAYLOAD_PORT` | `3000` | Payload server port |
| `ADMIN_PORT` | `8443` | Admin panel port |
| `DATABASE_NAME` | `xsshunterexpress` | PostgreSQL database |
| `DATABASE_USER` | `xsshunterexpress` | PostgreSQL username |
| `DATABASE_PASSWORD` | `xsshunterexpress` | PostgreSQL password |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `HOSTNAME` | `localhost:3000` | Callback hostname |
| `SCREENSHOTS_DIR` | `/tmp/xsshunter-screenshots` | Screenshot storage |
| `CONTROL_PANEL_ENABLED` | `true` | Enable admin panel |
| `SMTP_EMAIL_NOTIFICATIONS_ENABLED` | `false` | Email disabled in dev |

## Security Considerations

⚠️ **Development mode is for local testing only!**

- Uses self-signed SSL certificate
- Relaxed security headers for development
- Verbose error messages for debugging
- Should never be exposed to the internet
- Use production mode with Docker for deployment

## Key Features in Development Mode

- **Dual-Port Architecture**: Separate ports for payload and admin
- **Auto-Build**: Frontend automatically built if needed
- **Database Management**: Easy database reset option
- **Hot Reload**: Optional Vue 3 development server
- **Comprehensive Testing**: Full test suite included
- **Extension System**: Test custom JavaScript extensions locally
- **Self-Signed HTTPS**: Admin panel uses HTTPS even in dev
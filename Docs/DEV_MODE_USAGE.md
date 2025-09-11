# Development Mode Configuration for XSS Hunter Express

# NodeJS

Use nvm to set nodejs environment to version 12.

## Overview
XSS Hunter Express now supports both development and production modes, allowing you to run the application locally without SSL/TLS configuration. The modified codebase automatically adapts to the environment.

## Quick Start

### Using the Development Script (Recommended)
The easiest way to run in development mode:

```bash
# Run with automatic frontend build (if needed)
./run-dev.sh

# Force rebuild the frontend
./run-dev.sh --rebuild-frontend

# Recreate PostgreSQL database in Docker
./run-dev.sh --rebuild-postgres

# Rebuild both frontend and database
./run-dev.sh --rebuild-frontend --rebuild-postgres

# Show help
./run-dev.sh --help
```

The script will:
- Check and start PostgreSQL Docker container if needed
- Build the frontend if the dist directory is missing
- Set all required environment variables
- Create necessary directories
- Test database connection
- Start the server on port 3000

### Manual Development Mode
To run the server manually in development mode:

```bash
# Set all required environment variables
export DEV_MODE=true
export PORT=3000
export DATABASE_NAME=xsshunterexpress
export DATABASE_USER=xsshunterexpress
export DATABASE_PASSWORD=xsshunterexpress
export DATABASE_HOST=localhost
export HOSTNAME=localhost:3000
export SCREENSHOTS_DIR=/tmp/xsshunter-screenshots
export CONTROL_PANEL_ENABLED=true
export SMTP_EMAIL_NOTIFICATIONS_ENABLED=false

# Ensure PostgreSQL Docker container is running
docker ps | grep xsshunter-express_postgresdb_1 || docker-compose up -d postgresdb

# Run the server
node server.js
```

### Production Mode (HTTPS with Let's Encrypt)
To run the server in production mode with automatic SSL:

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or manually with required environment variables
NODE_ENV=production SSL_CONTACT_EMAIL=your-email@example.com node server.js
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DEV_MODE` | No | Set to `"true"` to enable development mode | `undefined` |
| `NODE_ENV` | No | Set to `"development"` for dev mode or `"production"` for prod mode | `undefined` |
| `PORT` | No (dev only) | HTTP port for development mode | `3000` |
| `DATABASE_NAME` | Yes | PostgreSQL database name | `xsshunterexpress` |
| `DATABASE_USER` | Yes | PostgreSQL username | `xsshunterexpress` |
| `DATABASE_PASSWORD` | Yes | PostgreSQL password | `xsshunterexpress` |
| `DATABASE_HOST` | Yes | PostgreSQL host (localhost for Docker) | `localhost` |
| `HOSTNAME` | Yes | Your hostname (use `localhost:3000` for dev) | N/A |
| `SCREENSHOTS_DIR` | Yes | Directory to store screenshots | `/tmp/xsshunter-screenshots` |
| `SSL_CONTACT_EMAIL` | Yes (prod only) | Email for Let's Encrypt SSL certificates | N/A |
| `CONTROL_PANEL_ENABLED` | No | Enable/disable web control panel | `true` |
| `SMTP_EMAIL_NOTIFICATIONS_ENABLED` | No | Enable email notifications | `false` |

## Key Changes for Development Mode

### 1. Server Configuration (`server.js`)
- Conditionally uses HTTP or HTTPS based on `DEV_MODE` or `NODE_ENV`
- HTTP server runs on specified `PORT` (default 3000) in development
- HTTPS with Greenlock/Let's Encrypt in production

### 2. Session Security (`api.js`)
- Session cookies set with `secure: false` in development mode
- Allows cookies to work over HTTP connections
- Automatically secure in production

### 3. XSS Probe Protocol (`app.js`)
- Dynamically sets protocol in probe.js payload
- Uses `http://` for callbacks in development
- Uses `https://` for callbacks in production

### 4. PostgreSQL in Docker
- Script automatically manages Docker PostgreSQL container
- Can recreate database with `--rebuild-postgres` flag
- Connects to `localhost:5432` (Docker exposes this port)

## Docker Compose Usage

### Development Mode with Docker Compose
Add to your `docker-compose.yml`:

```yaml
environment:
  - DEV_MODE=true
  - PORT=3000
  - HOSTNAME=localhost:3000
  # ... other environment variables
```

### Production Mode with Docker Compose
Keep the original configuration:

```yaml
environment:
  - SSL_CONTACT_EMAIL=your-email@example.com
  - HOSTNAME=your-domain.com
  # ... other environment variables
```

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if Docker container is running
docker ps | grep postgres

# Start PostgreSQL container if not running
docker-compose up -d postgresdb

# Recreate database from scratch
./run-dev.sh --rebuild-postgres
```

### Frontend Build Issues
```bash
# Rebuild frontend
./run-dev.sh --rebuild-frontend

# Or manually
cd front-end
npm install
npm run build
```

### Session/Cookie Issues
If you encounter session-related errors:
1. Ensure `DEV_MODE=true` is set
2. Clear browser cookies for localhost
3. Restart the server

## Access Points

- **Admin Panel**: http://localhost:3000/admin
- **XSS Probe**: http://localhost:3000/probe.js
- **API**: http://localhost:3000/api/v1/

## Notes

- In development mode, the server runs on HTTP only (no HTTPS)
- Default development port is 3000, but can be changed with `PORT` environment variable
- Production mode requires a valid domain name and `SSL_CONTACT_EMAIL` for Let's Encrypt
- The backup of the original `server.js` is saved as `server.js.backup`
- All XSS payloads will callback to HTTP endpoints in development mode

## Reverting Changes

To revert to the original server configuration:

```bash
cd /root/Desktop/xsshunter-dev/xsshunter-express-prod/xsshunter-express
cp server.js.backup server.js
```

## Security Considerations

⚠️ **Development mode is for local testing only!**
- No SSL/TLS encryption
- Session cookies not secure
- Should never be exposed to the internet
- Use production mode with proper SSL for any public-facing deployment
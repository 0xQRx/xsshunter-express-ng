# Dual-Port Architecture Implementation Plan

## Overview
This document outlines the approach for implementing proper separation between payload delivery and admin functionality using a dual-port architecture with minimal code changes.

## Current Architecture Analysis

### Current Routes Distribution

**Payload Routes (should be public):**
- `GET /` and `GET /:probe_id` - Serve XSS payload (probe.js delivery)
- `POST /js_callback` - Receive XSS fires with screenshot uploads
- `POST /background_callback` - Receive background data from payloads
- `POST /page_callback` - Receive collected HTML pages from payloads

**Admin Routes (should be restricted):**
- `/admin/*` - Vue.js admin interface
- `/api/v1/*` - All API endpoints
- `POST /test-payload` - Test payload functionality
- `GET /health` - Health check endpoint
- `GET /screenshots/:filename` - Serve screenshots to admin panel only

## Proposed Architecture

### 1. Server Splitting Strategy

Create two separate Express applications running on different ports:

**Payload Server (Port 80/443 or 3000 in dev)**
- Only handles XSS payload delivery and callbacks
- Minimal attack surface
- No authentication required
- Write access only for storing callback data (XSS fires, collected pages, background data)
- Read access only for serving probe.js
- Public-facing server
- Handles screenshot uploads from payloads (stores them)

**Admin Server (Port 8443)**
- Full admin panel and API
- Session management and authentication
- Full database access
- Serves stored screenshots to authenticated users
- Protected by firewall rules
- Restricted access

### 2. File Structure Reorganization

```
server/
├── shared/              # Shared utilities and configs
│   ├── database.js     # Database connection (existing)
│   ├── constants.js    # Shared constants (existing)
│   └── utils/          # Shared utilities (existing)
│
├── payload-server/     # New: Payload-specific server
│   ├── server.js       # Payload server entry point
│   ├── app.js         # Payload routes and middleware
│   └── handlers/      # Payload-specific handlers
│       ├── probe.js   # Probe delivery handler
│       └── callbacks.js # Callback handlers
│
├── admin-server/       # New: Admin-specific server
│   ├── server.js      # Admin server entry point
│   ├── app.js        # Admin app setup
│   ├── api.js        # API routes (modified from existing)
│   └── middleware/   # Admin-specific middleware
│
└── server.js          # Main entry point (orchestrator)
```

### 3. Implementation Steps

#### Step 1: Extract Shared Components
- Move `database.js`, `constants.js`, and `utils/` to `shared/` directory
- Update all import paths throughout the codebase
- Ensure backward compatibility

#### Step 2: Create Payload Server Module
Extract payload-serving functionality from current `app.js`:
- Minimal Express app configuration
- Routes to include:
  - Probe serving (`/`, `/:probe_id`)
  - Callback endpoints (`/js_callback`, `/background_callback`, `/page_callback`)
  - Screenshot upload handling (via multer in `/js_callback`)
- Remove all admin/API related code
- No session middleware needed
- Minimal security headers
- File storage handling for screenshots

#### Step 3: Create Admin Server Module
Move admin-specific functionality:
- All API routes from `api.js`
- Authentication and session management
- Vue.js admin interface serving
- Test payload endpoint
- Health check endpoint
- Screenshot serving endpoint (`/screenshots/:filename`)
- Full security middleware stack

#### Step 4: Update Main Server Entry
Modify `server.js` to orchestrate both servers:
- Initialize database once for both servers
- Handle port configuration for dev/prod environments
- Implement proper SSL setup for both servers
- Manage graceful shutdown for both

### 4. Key Code Changes

#### New server/server.js (orchestrator):
```javascript
const database = require('./shared/database.js');
const payloadServer = require('./payload-server/server');
const adminServer = require('./admin-server/server');

// Initialize database once
await database.database_init();
await importPayloadsOnStartup();

// Start servers on different ports
if (isDevelopment) {
    // Development mode
    await payloadServer.start(process.env.PAYLOAD_PORT || 3000);
    await adminServer.start(process.env.ADMIN_PORT || 8443);
} else {
    // Production mode with SSL
    await payloadServer.startWithSSL(80, 443, sslConfig);
    await adminServer.startWithSSL(8443, sslConfig);
}
```

#### Payload Server Characteristics:
- Remove session middleware
- Remove API routes
- Keep only essential payload functionality
- Write operations only for:
  - Storing XSS fire data (creates ProbeTokens for auth)
  - Saving collected pages (requires valid ProbeToken)
  - Storing background callback data (requires valid ProbeToken)
  - Saving screenshot files
- Read operations only for serving probe.js
- Minimal dependencies
- Stateless operation (but validates ProbeTokens from DB)
- Multer for handling screenshot uploads
- IMPORTANT: Must handle ProbeToken creation and validation

#### Admin Server Characteristics:
- All existing API routes
- Full session management
- Complete database operations
- Control panel serving
- Screenshot serving to authenticated users
- WebSocket support if needed
- Full authentication flow

### 5. Authentication Flow for Callbacks

The payload server implements a token-based authentication system for subsequent callbacks:

1. **Initial XSS Fire** (`/js_callback`):
   - Receives XSS data without authentication
   - Creates a ProbeToken with session_token
   - Returns payload_id and session_token to the probe
   - Probe stores these in window.xssPayloadId and window.xssSessionToken

2. **Subsequent Callbacks** (`/background_callback`, `/page_callback`):
   - Require payload_id and session_token in request
   - Validate token exists in ProbeTokens table
   - Update last_activity timestamp
   - Process the callback data only if valid

3. **Important Notes**:
   - Page collection happens AFTER tokens are received
   - Background callbacks require valid session tokens
   - This prevents unauthorized data submission
   - Tokens are tied to specific payload fires

### 6. Security Improvements

1. **Network Isolation**: 
   - Admin port (8443) can be firewalled to specific IPs
   - Payload server remains publicly accessible

2. **Reduced Attack Surface**: 
   - Payload server has minimal functionality
   - No admin capabilities on public-facing server

3. **Separate Authentication**: 
   - Admin server handles all authentication separately
   - No session cookies on payload server

4. **Database Access Control**: 
   - Payload server needs write access for:
     - PayloadFireResults table (XSS fires)
     - CollectedPages table (page captures)
     - Screenshot file storage
   - Read access only for serving probe.js
   - Admin server has full database access

5. **Rate Limiting**: 
   - Different rate limits for payload vs admin endpoints
   - More aggressive limiting on public payload server

### 7. Environment Variables

New environment variables to add:
- `PAYLOAD_PORT` - Port for payload server (default: 3000 in dev, 80 in prod)
- `ADMIN_PORT` - Port for admin server (default: 8443)
- `DUAL_PORT_MODE` - Enable dual-port architecture (default: true)

Existing variables remain compatible:
- `SSL_CONTACT_EMAIL` - Used for both servers in production
- `CONTROL_PANEL_ENABLED` - Controls admin server startup
- `DEV_MODE` - Affects both servers

### 8. Shared Resources Management

Both servers need access to certain shared resources:

1. **Database**: 
   - Single database connection pool shared between servers
   - Consider connection pool sizing for dual-server setup

2. **Screenshot Storage**:
   - Payload server writes screenshot files
   - Admin server reads screenshot files
   - Shared filesystem directory (SCREENSHOTS_DIR)
   - Consider using object storage (S3) for cloud deployments

3. **Configuration**:
   - Shared environment variables
   - SSL certificates (in production)
   - Database credentials

4. **Important Considerations**:
   - File permissions must allow both servers to access screenshots directory
   - If servers run on different machines, need shared storage solution
   - Database connection limits may need adjustment

### 9. Migration Path

To ensure smooth transition:

1. **Phase 1**: Refactor shared components
   - Extract shared utilities
   - Update import paths
   - Test existing functionality

2. **Phase 2**: Create server modules
   - Build payload server module
   - Build admin server module
   - Keep original server.js as fallback

3. **Phase 3**: Integration testing
   - Test both servers independently
   - Verify database sharing works
   - Check SSL configuration

4. **Phase 4**: Deployment
   - Update Docker configuration
   - Update documentation
   - Provide migration script if needed

### 10. Benefits

- **Security**: Complete isolation between public and admin functions
- **Scalability**: Can scale payload server independently
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to deploy servers on different machines
- **Backward Compatibility**: Minimal breaking changes

### 11. Considerations

- **Database Connection Pooling**: Need to ensure proper connection management
- **File Storage**: Screenshots need to be accessible from both servers
- **Monitoring**: Need to monitor both servers separately
- **Logging**: Separate log streams for each server
- **Deployment**: May need updated deployment scripts

### 12. Testing Requirements

- Unit tests for each server module
- Integration tests for cross-server communication
- Security tests for isolation verification
- Performance tests for dual-server overhead
- Migration tests for existing deployments

## Recent Updates & Fixes

Based on implementation testing, the following fixes have been applied:

1. **Email Notification Control**: Fixed to check database setting (`SEND_ALERT_EMAILS`) not just environment variable
2. **Page Collection Authentication**: Added ProbeToken validation to `/page_callback` endpoint
3. **Timing Fix**: Page collection now happens after authentication tokens are received
4. **Port Handling**: Fixed URL construction to include non-standard ports using `location.host`

These fixes ensure proper security and functionality in the dual-port architecture.

## Conclusion

This dual-port architecture provides robust separation between public-facing payload functionality and administrative operations while maintaining code maintainability and minimal breaking changes. The phased approach ensures a smooth transition with fallback options at each stage.
'use strict';

const database = require('./shared/database.js');
const { importPayloadsOnStartup } = require('./shared/utils/payload-importer.js');
const cleanupJobs = require('./shared/utils/cleanup-jobs.js');

// Import server modules
const payloadServer = require('./payload-server/server');
const adminServer = require('./admin-server/server');

// Check if we're running in development mode
const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';

// Check if dual-port mode is enabled (default: true)
const dualPortMode = process.env.DUAL_PORT_MODE !== 'false';

if (!dualPortMode) {
    console.log('[INFO] Dual-port mode disabled. Use the original server.js instead.');
    process.exit(0);
}

// In production mode, SSL_CONTACT_EMAIL is required
if (!isDevelopment && !process.env.SSL_CONTACT_EMAIL) {
    console.error(`[ERROR] The environment variable 'SSL_CONTACT_EMAIL' is not set, please set it.`);
    console.error(`[INFO] To run in development mode, set DEV_MODE=true`);
    process.exit();
}

(async () => {
    console.log('='.repeat(60));
    console.log('Starting XSS Hunter Express - Dual Port Mode');
    console.log('='.repeat(60));
    
    try {
        // Initialize database (shared between both servers)
        console.log('[Database] Initializing...');
        await database.database_init();
        console.log('[Database] Initialized successfully');
        
        // Import custom payloads from files
        console.log('[Payloads] Importing custom payloads...');
        await importPayloadsOnStartup();
        console.log('[Payloads] Import complete');
        
        // Initialize background cleanup jobs (runs in main process)
        console.log('[Cleanup] Initializing cleanup jobs...');
        cleanupJobs.initializeCleanupJobs();
        console.log('[Cleanup] Cleanup jobs started');
        
        if (isDevelopment) {
            // Development mode: Use HTTP for both servers
            const payloadPort = process.env.PAYLOAD_PORT || 3000;
            const adminPort = process.env.ADMIN_PORT || 8443;
            
            console.log('\n[Development Mode Configuration]');
            console.log(`Payload Server Port: ${payloadPort}`);
            console.log(`Admin Server Port: ${adminPort}`);
            
            // Start payload server
            console.log('\n[Payload Server] Starting...');
            await payloadServer.start(payloadPort);
            console.log(`[Payload Server] Ready at http://localhost:${payloadPort}`);
            
            // Start admin server
            if (process.env.CONTROL_PANEL_ENABLED === 'true') {
                console.log('\n[Admin Server] Starting...');
                await adminServer.start(adminPort);
                console.log(`[Admin Server] Ready at http://localhost:${adminPort}`);
                console.log(`[Admin Panel] Access at http://localhost:${adminPort}/admin`);
            } else {
                console.log('\n[Admin Server] Skipped - Control panel disabled');
                console.log('[Admin Server] Set CONTROL_PANEL_ENABLED=true to enable');
            }
            
        } else {
            // Production mode: Use HTTPS with Let's Encrypt
            const adminPort = process.env.ADMIN_PORT || 8443;
            
            console.log('\n[Production Mode Configuration]');
            console.log('Payload Server: Ports 80/443 with auto-SSL');
            console.log(`Admin Server: Port ${adminPort} with SSL`);
            console.log(`SSL Contact Email: ${process.env.SSL_CONTACT_EMAIL}`);
            
            // Start payload server with Greenlock
            console.log('\n[Payload Server] Starting with auto-SSL...');
            await payloadServer.startWithSSL(80, 443);
            console.log('[Payload Server] Ready with HTTPS via Let\'s Encrypt');
            
            // Start admin server
            if (process.env.CONTROL_PANEL_ENABLED === 'true') {
                console.log('\n[Admin Server] Starting...');
                
                // Admin server needs SSL config
                // It can share the same certificates from Greenlock
                const sslConfig = {
                    // These will be populated by Greenlock or provided via env vars
                };
                
                await adminServer.startWithSSL(adminPort, sslConfig);
                console.log(`[Admin Server] Ready at https://localhost:${adminPort}`);
                console.log(`[Admin Panel] Access at https://localhost:${adminPort}/admin`);
                
                console.log('\n[Security Notice]');
                console.log(`Admin port ${adminPort} should be firewalled to trusted IPs only`);
                console.log('Example: ufw allow from YOUR_IP to any port ' + adminPort);
            } else {
                console.log('\n[Admin Server] Skipped - Control panel disabled');
                console.log('[Admin Server] Set CONTROL_PANEL_ENABLED=true to enable');
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('XSS Hunter Express - Dual Port Mode Started Successfully');
        console.log('='.repeat(60));
        
        // Handle graceful shutdown
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        
        async function gracefulShutdown(signal) {
            console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);
            
            // Stop cleanup jobs
            cleanupJobs.stopCleanupJobs && cleanupJobs.stopCleanupJobs();
            
            // Close database connection
            if (database.sequelize) {
                await database.sequelize.close();
                console.log('[Database] Connection closed');
            }
            
            console.log('[Shutdown] Complete');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('[Fatal Error] Failed to start servers:', error);
        process.exit(1);
    }
})();
'use strict';

const get_app_server = require('./app-refactored.js');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Check if we're running in development mode
const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';

async function start(port) {
    const app = await get_app_server();

    const server = http.createServer(app);

    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`[Payload Server] Running on http://localhost:${port}`);
            if (isDevelopment) {
                console.log(`[Payload Server] Running in DEVELOPMENT mode`);
            }
            resolve(server);
        });
    });
}

async function startWithSSL(httpPort, httpsPort) {
    const app = await get_app_server();

    console.log(`[Dual Protocol] Setting up servers for ${process.env.HOSTNAME}`);
    console.log(`[Dual Protocol] Email: ${process.env.SSL_CONTACT_EMAIL}`);

    // CRITICAL: Start HTTP server FIRST to claim port 80 before Greenlock
    // This prevents Greenlock from taking over port 80 with redirects
    const httpServer = http.createServer(app);

    await new Promise((resolve) => {
        httpServer.listen(httpPort, () => {
            console.log(`[HTTP Server] Listening on port ${httpPort}`);
            console.log(`[HTTP Server] Serving all paths directly (no HTTPS redirect)`);
            console.log(`[HTTP Server] Protocol-relative URLs (//domain/) work on HTTP sites`);
            resolve();
        });
    });

    // Now set up Greenlock for HTTPS after HTTP is already bound
    const configDir = '/app/greenlock.d';
    const configPath = path.join(configDir, 'config.json');

    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Create config.json for Greenlock v4 if missing
    if (!fs.existsSync(configPath)) {
        const config = {
            defaults: {
                store: { module: "greenlock-store-fs" },
                challenges: {
                    "http-01": { 
                        module: "acme-http-01-standalone",
                        // Tell ACME challenge to use our existing HTTP server
                        // This prevents Greenlock from trying to bind to port 80
                        standalone: false
                    }
                },
                renewOffset: "-30d",
                renewStagger: "3d",
                accountKeyType: "EC-P256",
                serverKeyType: "RSA-2048",
                subscriberEmail: process.env.SSL_CONTACT_EMAIL,
                agreeToTerms: true
            },
            sites: [{
                subject: process.env.HOSTNAME,
                altnames: [process.env.HOSTNAME]
            }]
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`[Greenlock] Configuration created for ${process.env.HOSTNAME}`);
    }

    // Since our HTTP server is already bound to port 80,
    // Greenlock's serve() will detect this and only bind to 443
    // This gives us the best of both worlds:
    // - Our HTTP server (no redirects) on port 80
    // - Greenlock's HTTPS with auto-renewal on port 443
    
    console.log(`[Greenlock] Initializing (port 80 already bound by our HTTP server)`);
    
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',
        configDir: configDir,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
        cluster: false
    });
    
    // Greenlock.serve() returns servers object
    // Since port 80 is taken, it should only bind to 443
    const servers = greenlock.serve(app);
    
    console.log(`[HTTPS Server] Greenlock managing port ${httpsPort} with auto-renewal`);
    console.log(`\n[Payload Server] Ready! Both HTTP and HTTPS are serving payloads`);
    
    // Note about first-time certificate generation
    const liveDir = path.join(configDir, 'live', process.env.HOSTNAME);
    if (!fs.existsSync(liveDir)) {
        console.log(`\n[First Run] Visit https://${process.env.HOSTNAME} to trigger certificate generation`);
        console.log(`[First Run] ACME challenges will use our HTTP server on port ${httpPort}`);
    }

    return { 
        httpServer, 
        httpsServer: servers  // Greenlock is managing HTTPS
    };
}

module.exports = {
    start,
    startWithSSL
};
'use strict';

const get_app_server = require('./app-refactored.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

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
    
    // Start our custom HTTP server first - no redirects, serve everything
    // We need to handle ACME challenges for Let's Encrypt
    const httpServer = http.createServer((req, res) => {
        // Check if this is an ACME challenge request
        if (req.url && req.url.startsWith('/.well-known/acme-challenge/')) {
            // For ACME challenges, we need to serve files from Greenlock's challenge directory
            const challengePath = path.join('/app/greenlock.d', 'challenges', req.url.replace('/.well-known/acme-challenge/', ''));
            
            fs.readFile(challengePath, 'utf8', (err, data) => {
                if (err) {
                    // Fallback to the app for ACME challenges (Greenlock might handle it differently)
                    app(req, res);
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(data);
                }
            });
        } else {
            // For all other requests, serve our app
            app(req, res);
        }
    });
    
    httpServer.listen(httpPort, () => {
        console.log(`[HTTP Server] Listening on port ${httpPort}`);
        console.log(`[HTTP Server] Serving all paths directly (no HTTPS redirect)`);
        console.log(`[HTTP Server] ACME challenges supported at /.well-known/acme-challenge/`);
        console.log(`[HTTP Server] Protocol-relative URLs (//domain/) work on HTTP sites`);
    });
    
    // Set up Greenlock for HTTPS only (with our patch, it won't try to bind to port 80)
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
                    "http-01": { module: "acme-http-01-standalone" }
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
    
    console.log(`[Greenlock] Initializing (patched to skip port 80)`);
    
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',
        configDir: configDir,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
        cluster: false
    });
    
    // With our patch, greenlock.serve() will only bind to port 443
    // Our HTTP server on port 80 remains untouched
    const servers = greenlock.serve(app);
    
    console.log(`[Greenlock] Managing HTTPS on port ${httpsPort} with auto-renewal`);
    console.log(`[Greenlock] ACME challenges will use our HTTP server on port ${httpPort}`);
    console.log(`\n[Payload Server] Ready! Both HTTP and HTTPS are serving payloads`);
    
    // Note about first-time certificate generation
    const liveDir = path.join(configDir, 'live', process.env.HOSTNAME);
    if (!fs.existsSync(liveDir)) {
        console.log(`\n[First Run] Visit https://${process.env.HOSTNAME} to trigger certificate generation`);
    }
    
    return { httpServer, httpsServer: servers };
}

module.exports = {
    start,
    startWithSSL
};
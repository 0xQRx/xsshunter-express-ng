'use strict';

const get_app_server = require('./app-refactored.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');

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
    
    // Set up Greenlock first to get its middleware
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
    
    console.log(`[Greenlock] Initializing (with patch applied to skip port 80)`);
    
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',
        configDir: configDir,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
        cluster: false
    });
    
    // Create our own ACME challenge middleware
    const acmeApp = express();
    
    // Handle ACME challenges
    acmeApp.use('/.well-known/acme-challenge/', async (req, res, next) => {
        const token = req.path.slice(1); // Remove leading slash
        console.log(`[ACME] Challenge request for token: ${token}`);
        
        try {
            // Use Greenlock's internal method to get the challenge response
            const result = await greenlock.getAcmeHttp01ChallengeResponse({
                type: 'http-01',
                servername: req.hostname,
                token: token
            });
            
            if (result && result.keyAuthorization) {
                console.log(`[ACME] Responding with challenge for ${req.hostname}`);
                res.type('text/plain');
                res.send(result.keyAuthorization);
            } else {
                console.log(`[ACME] No challenge found for token ${token}`);
                res.status(404).send('Challenge not found');
            }
        } catch (err) {
            console.error(`[ACME] Error getting challenge:`, err.message);
            res.status(404).send('Challenge not found');
        }
    });
    
    // Fall back to main app for all other requests
    acmeApp.use(app);
    
    // Start HTTP server with our ACME-aware app
    const httpServer = http.createServer(acmeApp);
    
    httpServer.listen(httpPort, () => {
        console.log(`[HTTP Server] Listening on port ${httpPort}`);
        console.log(`[HTTP Server] Serving all paths directly (no HTTPS redirect)`);
        console.log(`[HTTP Server] Handling ACME challenges at /.well-known/acme-challenge/`);
        console.log(`[HTTP Server] Protocol-relative URLs (//domain/) work on HTTP sites`);
    });
    
    // With our patch applied, greenlock.serve() will only bind to port 443
    const servers = greenlock.serve(app);
    
    console.log(`[Greenlock] Managing HTTPS on port ${httpsPort} with auto-renewal`);
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
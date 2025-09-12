'use strict';

const get_app_server = require('./app-refactored.js');
const http = require('http');
const https = require('https');
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
    
    // Start simple HTTP server - no redirects, serve everything
    const httpServer = http.createServer(app);
    
    httpServer.listen(httpPort, () => {
        console.log(`[HTTP Server] Listening on port ${httpPort}`);
        console.log(`[HTTP Server] Serving all paths directly (no HTTPS redirect)`);
        console.log(`[HTTP Server] Protocol-relative URLs (//domain/) will work on HTTP sites`);
    });
    
    // Set up HTTPS
    const configDir = '/app/greenlock.d';
    
    // Check for existing Let's Encrypt certificates
    const liveDir = path.join(configDir, 'live', process.env.HOSTNAME);
    const certPath = path.join(liveDir, 'fullchain.pem');
    const keyPath = path.join(liveDir, 'privkey.pem');
    
    let httpsOptions = null;
    
    // First, check if we have Let's Encrypt certificates
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        console.log(`[HTTPS Server] Using existing Let's Encrypt certificates`);
        httpsOptions = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath)
        };
        
        // Create and start HTTPS server
        const httpsServer = https.createServer(httpsOptions, app);
        
        httpsServer.listen(httpsPort, () => {
            console.log(`[HTTPS Server] Listening on port ${httpsPort}`);
            console.log(`[HTTPS Server] Protocol-relative URLs (//domain/) will work on HTTPS sites`);
            console.log(`\n[Payload Server] Ready! Both HTTP and HTTPS are serving payloads`);
        });
        
        return { httpServer, httpsServer };
    }
    
    // No certificates yet - we need to generate them
    console.log(`[HTTPS Server] No certificates found yet`);
    console.log(`[Certificate Generation] Starting Greenlock for initial certificate generation...`);
    
    // For initial certificate generation, we need to let Greenlock handle the HTTP server
    // for ACME challenges. Close our simple HTTP server first.
    httpServer.close(() => {
        console.log(`[Certificate Generation] Temporarily closed HTTP server for ACME challenges`);
    });
    
    // Set up Greenlock for certificate generation
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Create config.json for Greenlock v4
    const configPath = path.join(configDir, 'config.json');
    const config = {
        defaults: {
            store: {
                module: "greenlock-store-fs"
            },
            challenges: {
                "http-01": {
                    module: "acme-http-01-standalone"
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
    
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',
        configDir: configDir,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
        cluster: false
    });
    
    return new Promise((resolve) => {
        console.log(`[Certificate Generation] Greenlock is handling HTTP and HTTPS`);
        console.log(`[Certificate Generation] Visit https://${process.env.HOSTNAME} to trigger certificate generation`);
        console.log(`[Certificate Generation] After certificates are generated, restart for dual-protocol support`);
        
        const servers = greenlock.serve(app);
        
        // Monitor for certificate generation
        const checkCertificates = setInterval(() => {
            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                clearInterval(checkCertificates);
                console.log(`\n[Certificate Generation] Success! Certificates have been generated`);
                console.log(`[IMPORTANT] Please restart the server to enable dual-protocol support`);
                console.log(`[IMPORTANT] After restart, HTTP will serve without redirects`);
            }
        }, 5000);
        
        setTimeout(() => {
            resolve(servers);
        }, 2000);
    });
}

module.exports = {
    start,
    startWithSSL
};
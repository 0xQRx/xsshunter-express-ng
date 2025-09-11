'use strict';

const get_app_server = require('./app-refactored.js');

// Check if we're running in development mode
const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';

async function start(port) {
    const app = await get_app_server();
    const http = require('http');
    
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
    const fs = require('fs');
    const path = require('path');
    
    console.log(`[Greenlock] Initializing for domain: ${process.env.HOSTNAME}`);
    console.log(`[Greenlock] Email: ${process.env.SSL_CONTACT_EMAIL}`);
    
    // Ensure the config directory exists
    const configDir = '/app/greenlock.d';
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
    
    // Write the config file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[Greenlock] Configuration written to ${configPath}`);
    
    // Initialize Greenlock with v4 proper configuration
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',
        configDir: configDir,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
        cluster: false
    });
    
    // Start the servers
    return new Promise((resolve) => {
        console.log(`[Greenlock] Starting HTTP on ${httpPort}, HTTPS on ${httpsPort}`);
        const servers = greenlock.serve(app);
        
        // Give it a moment to start up
        setTimeout(() => {
            console.log(`[Payload Server] Started with SSL/TLS via Let's Encrypt`);
            console.log(`[Payload Server] Domain: ${process.env.HOSTNAME}`);
            console.log(`[Payload Server] HTTP redirect and HTTPS ready`);
            resolve(servers);
        }, 2000);
    });
}

module.exports = {
    start,
    startWithSSL
};
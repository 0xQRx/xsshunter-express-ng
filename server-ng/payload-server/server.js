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
    const path = require('path');
    
    // In production, use Greenlock for automatic SSL (matching original server.js)
    require('greenlock-express').init({
        packageRoot: path.join(__dirname, '..'),  // Points to server-ng directory
        configDir: './greenlock.d',  // Relative to packageRoot
        cluster: false,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
    }).serve(app);
    
    console.log(`[Payload Server] Starting with SSL/TLS via Let's Encrypt`);
    console.log(`[Payload Server] HTTP: ${httpPort}, HTTPS: ${httpsPort}`);
    
    return app;
}

module.exports = {
    start,
    startWithSSL
};
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
    
    // In production, use Greenlock for automatic SSL
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',  // Absolute path
        configDir: '/app/greenlock.d',  // Absolute path matching Docker volume
        cluster: false,
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
    });
    
    // Start the servers and wait for ready
    return new Promise((resolve) => {
        const servers = greenlock.serve(app);
        
        // Give it a moment to start up
        setTimeout(() => {
            console.log(`[Payload Server] Started with SSL/TLS via Let's Encrypt`);
            console.log(`[Payload Server] HTTP on port ${httpPort}, HTTPS on port ${httpsPort}`);
            resolve(servers);
        }, 2000);
    });
}

module.exports = {
    start,
    startWithSSL
};
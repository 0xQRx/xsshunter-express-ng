'use strict';

const get_app_server = require('./app.js');

// Check if we're running in development mode
const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';

async function start(port) {
    const app = await get_app_server();
    const http = require('http');
    
    const server = http.createServer(app);
    
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`[Admin Server] Running on http://localhost:${port}`);
            if (isDevelopment) {
                console.log(`[Admin Server] Running in DEVELOPMENT mode`);
            }
            if (process.env.CONTROL_PANEL_ENABLED === 'true') {
                console.log(`[Admin Server] Control panel enabled at http://localhost:${port}/admin`);
            }
            resolve(server);
        });
    });
}

async function startWithSSL(port, sslConfig) {
    const app = await get_app_server();
    const https = require('https');
    const fs = require('fs');
    
    // Use provided SSL config or try to load from files
    let httpsOptions = sslConfig;
    
    if (!httpsOptions && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
        httpsOptions = {
            cert: fs.readFileSync(process.env.SSL_CERT_PATH),
            key: fs.readFileSync(process.env.SSL_KEY_PATH)
        };
    }
    
    if (!httpsOptions) {
        console.error('[Admin Server] No SSL configuration provided');
        throw new Error('SSL configuration required for production admin server');
    }
    
    const server = https.createServer(httpsOptions, app);
    
    return new Promise((resolve) => {
        server.listen(port, () => {
            console.log(`[Admin Server] Running on https://localhost:${port}`);
            if (process.env.CONTROL_PANEL_ENABLED === 'true') {
                console.log(`[Admin Server] Control panel enabled at https://localhost:${port}/admin`);
            }
            resolve(server);
        });
    });
}

module.exports = {
    start,
    startWithSSL
};
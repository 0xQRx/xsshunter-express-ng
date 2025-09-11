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

async function startWithSSL(port) {
    const app = await get_app_server();
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    
    // Try to find Greenlock certificates for the hostname
    const hostname = process.env.HOSTNAME;
    const greenlockDir = path.join(__dirname, '..', 'greenlock.d');
    const liveDir = path.join(greenlockDir, 'live', hostname);
    
    let httpsOptions = null;
    
    // First try to use Greenlock certificates
    if (hostname && fs.existsSync(liveDir)) {
        try {
            httpsOptions = {
                cert: fs.readFileSync(path.join(liveDir, 'fullchain.pem')),
                key: fs.readFileSync(path.join(liveDir, 'privkey.pem'))
            };
            console.log('[Admin Server] Using Let\'s Encrypt certificates');
        } catch (err) {
            console.warn('[Admin Server] Failed to load Greenlock certificates:', err.message);
        }
    }
    
    // Fallback to environment variable paths
    if (!httpsOptions && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
        try {
            httpsOptions = {
                cert: fs.readFileSync(process.env.SSL_CERT_PATH),
                key: fs.readFileSync(process.env.SSL_KEY_PATH)
            };
            console.log('[Admin Server] Using certificates from environment variables');
        } catch (err) {
            console.warn('[Admin Server] Failed to load certificates from env paths:', err.message);
        }
    }
    
    // Final fallback: self-signed certificates for development
    if (!httpsOptions) {
        console.warn('[Admin Server] No valid SSL certificates found');
        console.warn('[Admin Server] Generating self-signed certificate (NOT FOR PRODUCTION)');
        
        const selfsigned = require('selfsigned');
        const attrs = [{ name: 'commonName', value: hostname || 'localhost' }];
        const pems = selfsigned.generate(attrs, { days: 365 });
        
        httpsOptions = {
            cert: pems.cert,
            key: pems.private
        };
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
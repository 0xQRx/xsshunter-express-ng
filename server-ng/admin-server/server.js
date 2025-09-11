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
    const { waitForSSLCertificates } = require('./wait-for-ssl');
    
    // Try to find Greenlock certificates for the hostname
    const hostname = process.env.HOSTNAME;
    
    let httpsOptions = null;
    
    // In production, wait for Let's Encrypt certificates
    if (hostname && process.env.NODE_ENV === 'production') {
        console.log('[Admin Server] Waiting for Let\'s Encrypt certificates...');
        const certs = await waitForSSLCertificates(hostname); // Uses default 20 retries, 30s each
        
        if (certs) {
            httpsOptions = certs;
            console.log('[Admin Server] Using Let\'s Encrypt certificates');
        } else {
            console.warn('[Admin Server] Let\'s Encrypt certificates not available after waiting');
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
    
    // Final fallback - generate self-signed certificate
    if (!httpsOptions) {
        console.warn('[Admin Server] No valid SSL certificates found');
        console.warn('[Admin Server] Generating self-signed certificate (fallback)');
        
        const selfsigned = require('selfsigned');
        const attrs = [{ name: 'commonName', value: hostname || 'localhost' }];
        const pems = selfsigned.generate(attrs, { days: 365 });
        
        httpsOptions = {
            cert: pems.cert,
            key: pems.private
        };
        
        console.warn('[Admin Server] Using self-signed certificate - browser will show security warning');
    }
    
    // Only create HTTPS server if we have options
    if (httpsOptions) {
        const server = https.createServer(httpsOptions, app);
        
        return new Promise((resolve) => {
            server.listen(port, () => {
                if (process.env.CONTROL_PANEL_ENABLED === 'true') {
                    console.log(`[Admin Server] Control panel enabled.`);
                }
                resolve(server);
            });
        });
    }
}

module.exports = {
    start,
    startWithSSL
};
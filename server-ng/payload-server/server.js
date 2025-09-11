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
    
    console.log(`[Greenlock] Initializing for domain: ${process.env.HOSTNAME}`);
    console.log(`[Greenlock] Email: ${process.env.SSL_CONTACT_EMAIL}`);
    
    // Use the most basic Greenlock configuration that matches the old working setup
    const greenlock = require('greenlock-express').init({
        packageRoot: '/app/server-ng',
        configDir: '/app/greenlock.d',
        maintainerEmail: process.env.SSL_CONTACT_EMAIL,
        cluster: false,
        
        // This is the key - telling Greenlock which domains to handle
        approveDomains: function(opts, certs, cb) {
            // Approve our domain
            if (opts.domain === process.env.HOSTNAME) {
                opts.email = process.env.SSL_CONTACT_EMAIL;
                opts.agreeTos = true;
                
                // For v4, ensure we have the right structure
                if (!opts.domains) {
                    opts.domains = [process.env.HOSTNAME];
                }
                if (!opts.subject) {
                    opts.subject = process.env.HOSTNAME;
                }
                
                console.log(`[Greenlock] Approving domain: ${opts.domain}`);
                
                if (cb) {
                    // v2/v3 style callback
                    cb(null, { options: opts, certs: certs });
                } else {
                    // v4 style promise
                    return Promise.resolve({ options: opts, certs: certs });
                }
            } else {
                console.log(`[Greenlock] Rejecting unknown domain: ${opts.domain}`);
                const err = new Error(`Domain not configured: ${opts.domain}`);
                if (cb) {
                    cb(err);
                } else {
                    return Promise.reject(err);
                }
            }
        }
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
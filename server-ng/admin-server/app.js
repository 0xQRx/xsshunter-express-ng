const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const asyncfs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const database = require('../shared/database.js');
const Settings = database.Settings;
const api = require('./api.js');
const constants = require('../shared/constants.js');
const crypto = require('crypto');

// Check if we're in development mode
const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';

function set_secure_headers(req, res) {
    res.set("X-XSS-Protection", "mode=block");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "deny");

    if (req.path.startsWith(constants.API_BASE_PATH)) {
        res.set("Content-Security-Policy", "default-src 'none'; script-src 'none'");
        res.set("Content-Type", "application/json");
        return;
    }
}

async function get_app_server() {
    const app = express();

    // Set up error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Admin Server] Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[Admin Server] Uncaught Exception:', error);
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

    app.set('case sensitive routing', true);
    
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Set security headers
    app.use(async function(req, res, next) {
        set_secure_headers(req, res);
        next();
    });

    // Screenshot endpoint removed - now handled by routes/screenshots.js with proper authentication
    // Health endpoint removed - exposed configuration details without authentication

    // Test endpoint for payload console - no CSP restrictions
    app.post('/test-payload', async (req, res) => {
        // Validate test token
        const token = req.body.test_token;
        if (!token) {
            res.status(401).json({
                "success": false,
                "error": "No test token provided",
                "code": "MISSING_TOKEN"
            }).end();
            return;
        }

        const tokenTimestamp = app.locals.testTokens.get(token);
        if (!tokenTimestamp) {
            res.status(401).json({
                "success": false,
                "error": "Invalid test token",
                "code": "INVALID_TOKEN"
            }).end();
            return;
        }

        // Check if token is expired (30 seconds validity)
        const now = Date.now();
        if (now - tokenTimestamp > 30000) {
            app.locals.testTokens.delete(token);
            res.status(401).json({
                "success": false,
                "error": "Test token expired",
                "code": "TOKEN_EXPIRED"
            }).end();
            return;
        }

        // Token is valid, delete it (one-time use)
        app.locals.testTokens.delete(token);

        // Clean up old tokens periodically
        if (app.locals.testTokens.size > 100) {
            const cutoff = now - 30000;
            for (const [oldToken, timestamp] of app.locals.testTokens.entries()) {
                if (timestamp < cutoff) {
                    app.locals.testTokens.delete(oldToken);
                }
            }
        }

        // Read the template file
        const templatePath = path.join(__dirname, '../templates/test-payload.html');
        let testHTML = await asyncfs.readFile(templatePath, 'utf8');
        
        // Replace the payload code placeholder with the actual code
        const payloadCode = req.body.code || '// No code provided';
        testHTML = testHTML.replace('{{PAYLOAD_CODE}}', payloadCode);
        
        // Send without CSP headers
        res.set("Content-Type", "text/html");
        res.send(testHTML);
    });

    // Initialize test tokens store
    app.locals.testTokens = new Map();

    // Set up API server (all admin routes)
    if(process.env.CONTROL_PANEL_ENABLED === 'true') {
        await api.set_up_api_server(app);
    } else {
        console.log(`[Admin Server] Control panel NOT enabled. Not serving API or GUI.`);
    }

    // Global error handler
    app.use((err, req, res, next) => {
        console.error('[Admin Server Error]:', err);
        
        if (res.headersSent) {
            return;
        }
        
        res.status(err.status || 500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
        });
    });

    return app;
}

module.exports = get_app_server;
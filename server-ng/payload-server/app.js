/**
 * Refactored Payload Server Application
 * Uses modular handlers for different endpoints
 */

const bodyParser = require('body-parser');
const express = require('express');
const multer = require('multer');
const validate = require('express-jsonschema').validate;

// Import handlers
const { serveProbe } = require('./handlers/probe.js');
const { handleJSCallback } = require('./handlers/callback.js');
const { handleBackgroundCallback } = require('./handlers/background.js');
const { handlePageCallback } = require('./handlers/page.js');

// Import database and utilities
const database = require('../shared/database.js');
const config = require('../shared/config.js');
const { errorHandler, notFoundHandler } = require('../shared/middleware/error-handler.js');
const { setSecurityHeaders, enforceLowercaseUrls } = require('./middleware/security.js');
const { guardAgainstBots } = require('./middleware/bot-guard.js');

/**
 * Validation schemas
 */
const JSCallbackSchema = {
    "type": "object",
    "properties": {
        "probe_secret": {
            "type": "string",
            "required": true
        },
        "uri": {
            "type": "string",
            "default": ""
        },
        "cookies": {
            "type": "string",
            "default": ""
        },
        "referrer": {
            "type": "string",
            "default": ""
        },
        "user-agent": {
            "type": "string",
            "default": ""
        },
        "browser-time": {
            "type": "string",
            "default": "0",
            "pattern": "^\\d+$"
        },
        "probe-uid": {
            "type": "string",
            "default": ""
        },
        "origin": {
            "type": "string",
            "default": ""
        },
        "injection_key": {
            "type": "string",
            "default": ""
        },
        "title": {
            "type": "string",
            "default": ""
        },
        "text": {
            "type": "string",
            "default": ""
        },
        "was_iframe": {
            "type": "string",
            "default": "false",
            "enum": ["true", "false"]
        },
        "dom": {
            "type": "string",
            "default": ""
        },
        "localStorage": {
            "type": "string",
            "default": "[]"
        },
        "sessionStorage": {
            "type": "string",
            "default": "[]"
        },
        "custom_data": {
            "type": "string",
            "default": "[]"
        }
    }
};

const BackgroundCallbackSchema = {
    "type": "object",
    "properties": {
        "payload_id": {
            "type": "string",
            "required": true
        },
        "session_token": {
            "type": "string",
            "required": true
        },
        "custom_data": {
            "type": "object",
            "required": true
        }
    }
};

const CollectedPagesCallbackSchema = {
    "type": "object",
    "properties": {
        "uri": {
            "type": "string",
            "default": ""
        },
        "html": {
            "type": "string",
            "default": "" 
        },
        "payload_id": {
            "type": "string",
            "required": true
        },
        "session_token": {
            "type": "string",
            "required": true
        }
    }
};


/**
 * Get the refactored app server
 */
async function get_app_server() {
    const app = express();
    
    // Configure multer with file size limits
    const upload = multer({ 
        dest: '/tmp/',
        limits: {
            fileSize: config.limits.maxPayloadSizeMB * 1024 * 1024 // Convert MB to bytes
        }
    });
    
    // Set up process error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Payload Server] Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[Payload Server] Uncaught Exception:', error);
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

    // Set up error handlers
    app.use((error, req, res, next) => {
        if (error.name === 'JsonSchemaValidation') {
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
            res.set("Access-Control-Max-Age", "86400");
            
            console.error(`[Validation Error] ${req.path}:`, error.validations);
            res.status(400).json({
                error: "Invalid request data",
                details: error.validations
            });
            return;
        }
        next(error);
    });

    // Enable body parsing with same payload size limits
    const bodyLimit = `${config.limits.maxPayloadSizeMB}mb`;
    app.use(bodyParser.json({ limit: bodyLimit }));
    app.use(bodyParser.urlencoded({ limit: bodyLimit, extended: true }));

    // Enforce lowercase URLs to prevent bypass techniques
    app.use(enforceLowercaseUrls);

    // Apply security headers to all requests
    app.use(setSecurityHeaders);

    // CORS OPTIONS handler - use middleware approach instead of wildcard
    app.use((req, res, next) => {
        if (req.method === 'OPTIONS') {
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
            res.set("Access-Control-Max-Age", "86400");
            res.status(200).end();
        } else {
            next();
        }
    });

    // XSS callback endpoint
    // Original uses upload.single('screenshot') to handle the screenshot field
    app.post('/js_callback', upload.single('screenshot'), validate({ body: JSCallbackSchema }), handleJSCallback);

    // Background data callback endpoint
    app.post('/background_callback', upload.none(), validate({ body: BackgroundCallbackSchema }), handleBackgroundCallback);

    // Page collection callback endpoint
    app.post('/page_callback', upload.none(), validate({ body: CollectedPagesCallbackSchema }), handlePageCallback);

    // Probe serving routes with bot protection
    app.get('/', guardAgainstBots, serveProbe);
    app.get('/:probe_id', guardAgainstBots, serveProbe);

    // Add error handlers (note: these go after all routes)
    // The notFoundHandler is not needed here since we have a catch-all route
    app.use(errorHandler);

    return app;
}

module.exports = get_app_server;
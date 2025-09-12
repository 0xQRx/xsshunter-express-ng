/**
 * Refactored API server setup
 * Uses modular routes and middleware
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const favicon = require('serve-favicon');

const constants = require('../shared/constants.js');
const config = require('../shared/config.js');
const { errorHandler, notFoundHandler } = require('../shared/middleware/error-handler.js');
const { applySecurityHeaders, staticAssetHeaders } = require('../shared/middleware/security-headers.js');

// Import middleware
const { initializeSessionMiddleware } = require('./middleware/session.js');
const { csrfProtection, requireAuth } = require('./middleware/auth.js');

// Import routes
const authRoutes = require('./routes/auth.js');
const firesRoutes = require('./routes/fires.js');
const pagesRoutes = require('./routes/pages.js');
const settingsRoutes = require('./routes/settings.js');
const payloadsRoutes = require('./routes/payloads.js');
const injectionRoutes = require('./routes/injection.js');
const screenshotsRoutes = require('./routes/screenshots.js');


async function set_up_api_server(app) {
    // Initialize session middleware
    const sessionMiddleware = await initializeSessionMiddleware();
    
    // Session management
    app.use(sessionMiddleware);

    // Apply security headers with appropriate context
    app.use(applySecurityHeaders({ 
        enableHSTS: !config.isDevelopment,
        cspContext: 'default' 
    }));

    // CSRF protection for API routes
    app.use(csrfProtection);

    // Serve the front-end BEFORE authentication check
    // Serve static assets first
    app.use('/admin/assets', express.static(
        path.join(__dirname, '../../front-end-vue3/dist/assets'),
        {
            setHeaders: staticAssetHeaders,
        },
    ));
    
    // Serve the main app
    app.use('/admin/', express.static(
        path.join(__dirname, '../../front-end-vue3/dist/'),
        {
            setHeaders: staticAssetHeaders,
        },
    ));
    app.use(favicon(path.join(__dirname, '../../front-end-vue3/dist/favicon.ico')));

    // Authentication middleware for protected routes
    app.use(requireAuth);

    // Mount route handlers
    app.use(constants.API_BASE_PATH, authRoutes);
    app.use(constants.API_BASE_PATH + 'payloadfires', firesRoutes);
    app.use(constants.API_BASE_PATH + 'collected_pages', pagesRoutes);
    app.use(constants.API_BASE_PATH + 'settings', settingsRoutes);
    app.use(constants.API_BASE_PATH + 'payloads', payloadsRoutes);
    app.use(constants.API_BASE_PATH, injectionRoutes);
    
    // Screenshot route (not under API path, matches original)
    app.use('/screenshots', screenshotsRoutes);

    // CORS configuration
    const cors_options = {
        credentials: true,
        maxAge: 86400 // 1 day
    };

    if (config.isDevelopment) {
        cors_options.origin = function(origin, callback) {
            const allowedOrigins = [
                'http://localhost:5173',
                'http://localhost:8080',
                `http://localhost:${config.ports.payload}`,
                `http://localhost:${config.ports.admin}`
            ];
            
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        };
    } else {
        cors_options.origin = `https://${config.hostname}`;
    }

    app.use(cors(cors_options));
    
    // Add error handlers
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

module.exports = {
    set_up_api_server
};
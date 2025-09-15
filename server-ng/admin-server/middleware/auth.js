/**
 * Authentication middleware for API endpoints
 */

const constants = require('../../shared/constants.js');

/**
 * CSRF protection middleware
 * Checks for required CSRF header on API routes
 */
const csrfProtection = async function(req, res, next) {
    // Must be an API route else CSRF protection doesn't matter
    if(!req.path.startsWith(constants.API_BASE_PATH)) {
        next();
        return;
    }

    // Check to see if the required CSRF header is set
    // If it's not set, reject the request.
    const csrf_header_value = req.header(constants.csrf_header_name);
    if(!csrf_header_value) {
        res.status(401).json({
            "success": false,
            "error": "No CSRF header specified, request rejected.",
            "code": "CSRF_VIOLATION"
        }).end();
        return;
    }

    // Otherwise we're fine to continue
    next();
};

/**
 * Authentication middleware
 * Restricts access to protected API routes
 */
const requireAuth = async function(req, res, next) {
    const AUTHENTICATION_REQUIRED_ROUTES = [
        constants.API_BASE_PATH + 'payloadfires',
        constants.API_BASE_PATH + 'collected_pages',
        constants.API_BASE_PATH + 'settings',
        constants.API_BASE_PATH + 'payloads',
        constants.API_BASE_PATH + 'extensions',
        constants.API_BASE_PATH + 'generate-test-token',
        '/screenshots/',
    ];

    // Check if the path being accessed requires authentication
    let requires_authentication = false;
    AUTHENTICATION_REQUIRED_ROUTES.forEach(authenticated_route => {
        if(req.path.toLowerCase().startsWith(authenticated_route.toLowerCase())) {
            requires_authentication = true;
        }
    });

    // If the route is not one of the authentication required routes
    // then we can allow it through.
    if(!requires_authentication) {
        next();
        return;
    }

    // If the user is authenticated, let them pass
    if(req.session.authenticated === true) {
        next();
        return;
    }

    // Otherwise, fall to blocking them by default.
    res.status(401).json({
        "success": false,
        "error": "You must be authenticated to use this endpoint.",
        "code": "NOT_AUTHENTICATED"
    }).end();
    return;
};

module.exports = {
    csrfProtection,
    requireAuth,
};
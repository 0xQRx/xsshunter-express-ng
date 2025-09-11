/**
 * Centralized security headers middleware
 * Provides consistent security headers across all servers
 */

const constants = require('../constants.js');

/**
 * Core security headers applied to all responses
 */
const coreSecurityHeaders = {
    "X-XSS-Protection": "1; mode=block",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Permitted-Cross-Domain-Policies": "none"
};

/**
 * CSP policies for different contexts
 */
const cspPolicies = {
    // Strict CSP for API endpoints (no script execution)
    api: "default-src 'none'; frame-ancestors 'none'",
    
    // CSP for admin frontend (Vue app)
    adminFrontend: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; frame-ancestors 'none'",
    
    // No CSP for payload testing endpoints (intentional)
    payloadTest: null,
    
    // Basic CSP for other resources
    default: "default-src 'self'; frame-ancestors 'none'"
};

/**
 * Apply security headers middleware
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableHSTS - Enable HSTS header (production only)
 * @param {string} options.cspContext - CSP context ('api', 'adminFrontend', 'payloadTest', 'default')
 */
function applySecurityHeaders(options = {}) {
    const { enableHSTS = true, cspContext = 'default' } = options;
    
    return function(req, res, next) {
        // Apply core security headers
        Object.entries(coreSecurityHeaders).forEach(([header, value]) => {
            res.set(header, value);
        });
        
        // Apply HSTS in production
        if (enableHSTS && process.env.NODE_ENV === 'production') {
            res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        }
        
        // Apply appropriate CSP based on context
        let cspPolicy = null;
        
        // Determine CSP policy
        if (req.path.startsWith(constants.API_BASE_PATH)) {
            cspPolicy = cspPolicies.api;
            res.set("Content-Type", "application/json");
        } else if (req.path.startsWith('/admin/')) {
            cspPolicy = cspPolicies.adminFrontend;
        } else if (req.path === '/test-payload') {
            // Intentionally no CSP for payload testing
            cspPolicy = cspPolicies.payloadTest;
        } else {
            cspPolicy = cspPolicies[cspContext] || cspPolicies.default;
        }
        
        if (cspPolicy) {
            res.set("Content-Security-Policy", cspPolicy);
        }
        
        next();
    };
}

/**
 * Security headers specifically for static assets
 * Used with express.static setHeaders option
 * @param {Object} res - Response object
 * @param {String} path - File path
 * @param {Object} stat - File stat object
 */
function staticAssetHeaders(res, path, stat) {
    // Cache control for static assets
    res.set("Cache-Control", "public, max-age=3600");
    
    // Apply CSP for static assets
    res.set("Content-Security-Policy", cspPolicies.adminFrontend);
    
    // Apply core security headers
    Object.entries(coreSecurityHeaders).forEach(([header, value]) => {
        res.set(header, value);
    });
}

module.exports = {
    applySecurityHeaders,
    staticAssetHeaders,
    coreSecurityHeaders,
    cspPolicies
};
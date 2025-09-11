/**
 * Security middleware for payload server
 * Extends shared security headers with payload-specific features
 */

const { applySecurityHeaders } = require('../../shared/middleware/security-headers.js');

/**
 * Enforce lowercase URLs to prevent bypass techniques
 * This is specific to payload server to prevent XSS filter bypasses
 */
function enforceLowercaseUrls(req, res, next) {
    if (req.path.toLowerCase() !== req.path) {
        res.redirect(301, req.path.toLowerCase());
    } else {
        next();
    }
}

// Export the shared security headers for backward compatibility
// and the payload-specific lowercase URL enforcement
module.exports = {
    setSecurityHeaders: applySecurityHeaders({ 
        enableHSTS: process.env.NODE_ENV === 'production',
        cspContext: 'default' 
    }),
    enforceLowercaseUrls
};
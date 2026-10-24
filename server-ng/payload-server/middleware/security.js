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

/**
 * Reject POST bodies that are oversized or of unknown length before any parsing.
 * Node only reads Content-Length bytes, so this is a hard per-request cap
 * (multer limits are per field/file and can't bound the total on their own).
 * Browsers always send Content-Length for XHR/FormData uploads.
 */
function limitRequestSize(maxBytes) {
    return function(req, res, next) {
        if (req.method !== 'POST') {
            return next();
        }

        const contentLength = req.headers['content-length'];
        if (contentLength === undefined) {
            return res.status(411).json({ error: "Content-Length required" });
        }
        if (parseInt(contentLength, 10) > maxBytes) {
            return res.status(413).json({ error: "Payload too large" });
        }
        next();
    };
}

// Export the shared security headers for backward compatibility
// and the payload-specific lowercase URL enforcement
module.exports = {
    setSecurityHeaders: applySecurityHeaders({
        enableHSTS: process.env.NODE_ENV === 'production',
        cspContext: 'default'
    }),
    enforceLowercaseUrls,
    limitRequestSize
};
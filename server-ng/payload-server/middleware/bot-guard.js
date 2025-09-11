/**
 * Bot Guard Middleware
 * Prevents bots and direct browser navigation from accessing payloads
 * Allows legitimate XSS injection contexts
 */

/**
 * Blocks direct browser navigation and bot access
 * Permits all legitimate injection vectors
 */
function guardAgainstBots(req, res, next) {
    // Allow OPTIONS requests for CORS
    if (req.method === 'OPTIONS') {
        return next();
    }

    // Primary check: Sec-Fetch-Dest header (most reliable)
    // Only block if it's explicitly a document navigation
    const secFetchDest = req.headers['sec-fetch-dest'];
    const secFetchMode = req.headers['sec-fetch-mode'];
    
    if (secFetchDest === 'document' && secFetchMode === 'navigate') {
        // This is definitely a direct browser navigation
        console.log(`[Bot Guard] Blocked direct navigation from ${req.ip}`);
        return res.status(404).send('Not Found');
    }
    
    // Secondary check: Look for browser navigation patterns
    // Only when Sec-Fetch headers aren't available (older browsers)
    if (secFetchDest === undefined) {
        const accept = req.headers['accept'] || '';
        const referer = req.headers['referer'];
        
        // Check if this looks like a browser address bar navigation
        const isBrowserNavigation = 
            accept.startsWith('text/html,application/xhtml+xml') && 
            !referer && // No referer usually means direct navigation
            req.method === 'GET';
            
        if (isBrowserNavigation) {
            console.log(`[Bot Guard] Blocked probable direct navigation from ${req.ip}`);
            return res.status(404).send('Not Found');
        }
    }
    
    // Allow everything else - legitimate injection contexts
    next();
}

/**
 * Logs access context for monitoring (optional)
 * Helps understand what types of requests are hitting the server
 */
function logAccessContext(req, res, next) {
    const context = {
        dest: req.headers['sec-fetch-dest'] || 'unknown',
        mode: req.headers['sec-fetch-mode'] || 'unknown',
        site: req.headers['sec-fetch-site'] || 'unknown',
        accept: (req.headers['accept'] || '').substring(0, 50),
        referer: req.headers['referer'] ? 'present' : 'none',
        method: req.method,
        path: req.path
    };
    
    console.log(`[Access Context] ${JSON.stringify(context)}`);
    next();
}

module.exports = {
    guardAgainstBots,
    logAccessContext
};
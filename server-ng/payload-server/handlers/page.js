/**
 * Page collection callback handler
 */

const { v4: uuidv4 } = require('uuid');
const database = require('../../shared/database.js');
const ProbeTokens = database.ProbeTokens;
const CollectedPages = database.CollectedPages;
const { ensureString } = require('../../shared/utils/validation.js');
const { logError } = require('../../shared/middleware/error-handler.js');

/**
 * Handle page collection callback
 * POST /page_callback
 */
async function handlePageCallback(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    res.set("Access-Control-Max-Age", "86400");

    try {
        const { uri, html, payload_id, session_token } = req.body;
        
        // Validate required fields
        if (!payload_id || !session_token) {
            return res.status(400).json({ error: "Missing authentication" });
        }
        
        // Validate UUID format for payload_id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(payload_id)) {
            return res.status(400).json({ error: "Invalid payload ID format" });
        }
        
        // Validate session token format (64 char hex string)
        const tokenRegex = /^[0-9a-f]{64}$/i;
        if (!tokenRegex.test(session_token)) {
            return res.status(400).json({ error: "Invalid session token format" });
        }
        
        // Validate session token
        const probe_token = await ProbeTokens.findOne({
            where: {
                payload_fire_id: payload_id,
                session_token: session_token
            }
        });
        
        if (!probe_token) {
            console.log(`[Page callback] Invalid session token for payload ${payload_id}`);
            return res.status(401).json({ error: "Invalid session token" });
        }
        
        // Update last activity timestamp
        await probe_token.update({
            last_activity: new Date()
        });

        // Store the collected page with payload association
        // Ensure uri and html are strings (no size limit enforced)
        const page_insert_response = await CollectedPages.create({
            id: uuidv4(),
            uri: ensureString(uri),
            html: ensureString(html),
            payload_fire_id: payload_id
        });

        console.log(`[Page callback] Stored page for payload ${payload_id}: ${uri}`);

        // Send success response
        res.status(200).json({
            "status": "success",
            "page_id": page_insert_response.id
        }).end();
        
    } catch (error) {
        logError('Page callback', error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    handlePageCallback
};
/**
 * Background callback handler for continuous data collection
 */

const { v4: uuidv4 } = require('uuid');
const database = require('../../shared/database.js');
const ProbeTokens = database.ProbeTokens;
const PayloadFireResults = database.PayloadFireResults;

/**
 * Handle background data callback
 * POST /background_callback
 */
async function handleBackgroundCallback(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    res.set("Access-Control-Max-Age", "86400");

    try {
        const { payload_id, session_token, custom_data } = req.body;
        
        // Validate required fields
        if (!payload_id || !session_token || !custom_data) {
            return res.status(400).json({ error: "Missing required fields" });
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
        
        // Validate custom_data structure
        if (!custom_data || typeof custom_data !== 'object') {
            console.error(`[Background callback] Invalid custom_data structure`);
            return res.status(400).json({ error: "Invalid custom data format" });
        }
        
        // Validate session token
        const probe_token = await ProbeTokens.findOne({
            where: {
                payload_fire_id: payload_id,
                session_token: session_token
            }
        });
        
        if (!probe_token) {
            console.log(`[Background callback] Invalid session token for payload ${payload_id}`);
            return res.status(401).json({ error: "Invalid session token" });
        }
        
        // Update last activity timestamp
        await probe_token.update({
            last_activity: new Date()
        });

        // Get the existing payload fire record
        const payload_fire = await PayloadFireResults.findByPk(payload_id);
        
        if (!payload_fire) {
            console.log(`[Background callback] Payload fire not found: ${payload_id}`);
            return res.status(404).json({ error: "Payload fire not found" });
        }

        // Parse existing custom data
        let existing_data = [];
        try {
            existing_data = JSON.parse(payload_fire.custom_data || '[]');
        } catch (e) {
            console.error('[Background callback] Error parsing existing custom_data:', e);
            existing_data = [];
        }

        // Add timestamp to the new data
        const timestamped_data = {
            ...custom_data,
            timestamp: new Date().toISOString()
        };
        
        // Append new data to existing
        existing_data.push(timestamped_data);

        // Update the payload fire record with new custom data
        await payload_fire.update({
            custom_data: JSON.stringify(existing_data)
        });

        console.log(`[Background callback] Updated payload ${payload_id} with background data`);

        // Send success response
        res.status(200).json({
            "status": "success",
            "message": "Background data received"
        }).end();
        
    } catch (error) {
        console.error('[Background callback] Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    handleBackgroundCallback
};
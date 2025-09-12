/**
 * Probe payload serving handler
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const database = require('../../shared/database.js');
const config = require('../../shared/config.js');
const constants = require('../../shared/constants.js');
const Settings = database.Settings;
const ProbeTokens = database.ProbeTokens;
const Extensions = database.Extensions;

// Load XSS payload from file into memory
const XSS_PAYLOAD = fs.readFileSync(
    path.join(__dirname, '../../probe.js'),
    'utf8'
);

/**
 * Set security headers for payload responses
 */
function setPayloadHeaders(req, res) {
    res.set("X-XSS-Protection", "mode=block");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "deny");
}

/**
 * Serve the XSS probe payload with proper replacements
 * GET /* (catch-all route)
 */
async function serveProbe(req, res) {
    setPayloadHeaders(req, res);
    
    res.set("Content-Type", "application/javascript");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    
    // Extract probe_id from URL parameter (matches /:probe_id route)
    const probe_id = req.params.probe_id || 'default';
    
    let probe_secret;
    try {
        // Generate a unique probe secret for this payload request
        probe_secret = crypto.randomBytes(32).toString('hex');
        const request_ip = (req.connection && req.connection.remoteAddress && req.connection.remoteAddress.toString()) || req.ip;
        
        // Store the probe secret for later validation
        let attempts = 0;
        let tokenCreated = false;
        
        while (!tokenCreated && attempts < 3) {
            try {
                await ProbeTokens.create({
                    id: uuidv4(),
                    probe_secret: probe_secret,
                    used: false,
                    request_ip: request_ip
                });
                tokenCreated = true;
            } catch (error) {
                attempts++;
                if (attempts >= 3) {
                    console.error('[Probe Handler] Failed to create probe token after 3 attempts');
                    // Continue without probe secret
                    probe_secret = '';
                }
            }
        }
    } catch (error) {
        console.error('[Probe Handler] Error creating probe token:', error);
        probe_secret = '';
    }
    
    // Fetch configuration from database
    try {
        const db_promises = [
            Settings.findOne({
                where: {
                    key: constants.PAGES_TO_COLLECT_SETTINGS_KEY,
                }
            }),
            Settings.findOne({
                where: {
                    key: constants.CHAINLOAD_URI_SETTINGS_KEY,
                }
            }),
            Extensions.findAll({
                where: {
                    is_active: true
                },
                attributes: ['code', 'minified_code'],
                order: [['created_at', 'ASC']]
            })
        ];
        
        const db_results = await Promise.all(db_promises);
        const pages_to_collect = (db_results[0] === null) ? [] : JSON.parse(db_results[0].value);
        const chainload_uri = (db_results[1] === null) ? '' : db_results[1].value;
        const active_extensions = (db_results[2] || []).map(p => {
            if (p.minified_code) {
                return p.minified_code;
            }
            // Fallback to base64 encoding
            return Buffer.from(p.code).toString('base64');
        });
        
        // Determine protocol based on environment
        const protocol = config.isDevelopment ? 'http' : 'https';
        const hostname = config.hostname || 'localhost';
        
        // Send the payload with all replacements
        res.send(XSS_PAYLOAD.replace(
            /\[HOST_URL\]/g,
            `${protocol}://${hostname}`
        ).replace(
            '[COLLECT_PAGE_LIST_REPLACE_ME]',
            JSON.stringify(pages_to_collect)
        ).replace(
            '[CHAINLOAD_REPLACE_ME]',
            JSON.stringify(chainload_uri)
        ).replace(
            '[PROBE_SECRET]',
            probe_secret
        ).replace(
            '[PROBE_ID]',
            JSON.stringify(probe_id)
        ).replace(
            '[CUSTOM_PAYLOADS_REPLACE_ME]',
            JSON.stringify(active_extensions)
        ));
    } catch (error) {
        console.error('[Probe Handler] Error fetching configuration:', error);
        // Send basic payload with empty replacements
        res.send(XSS_PAYLOAD.replace(
            /\[HOST_URL\]/g,
            `${config.isDevelopment ? 'http' : 'https'}://${config.hostname || 'localhost'}`
        ).replace(
            '[COLLECT_PAGE_LIST_REPLACE_ME]',
            '[]'
        ).replace(
            '[CHAINLOAD_REPLACE_ME]',
            '""'
        ).replace(
            '[PROBE_SECRET]',
            probe_secret || ''
        ).replace(
            '[PROBE_ID]',
            '"default"'
        ).replace(
            '[CUSTOM_PAYLOADS_REPLACE_ME]',
            '[]'
        ));
    }
}

module.exports = {
    serveProbe,
    setPayloadHeaders
};
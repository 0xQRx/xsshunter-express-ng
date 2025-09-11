/**
 * XSS callback handler
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const asyncfs = require('fs').promises;
const database = require('../../shared/database.js');
const config = require('../../shared/config.js');
const PayloadFireResults = database.PayloadFireResults;
const InjectionRequests = database.InjectionRequests;
const ProbeTokens = database.ProbeTokens;
const notification = require('../../shared/utils/notification.js');

const SCREENSHOTS_DIR = path.resolve(config.storage.screenshotsDir);

/**
 * Process XSS payload fire callback
 * POST /js_callback
 */
async function handleJSCallback(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    res.set("Access-Control-Max-Age", "86400");

    try {
        // Validate probe secret
        const probe_secret = req.body.probe_secret;
        if (!probe_secret) {
            if (req.file && req.file.path) {
                asyncfs.unlink(req.file.path).catch(err => 
                    console.error('[Cleanup] Failed to delete temp file:', err)
                );
            }
            return res.status(401).json({ error: "Missing authentication" }).end();
        }

        // Check if probe secret exists and hasn't been used
        const probe_token = await ProbeTokens.findOne({
            where: { 
                probe_secret: probe_secret,
                used: false 
            }
        });

        if (!probe_token) {
            console.log(`Invalid or already used probe secret: ${probe_secret.substring(0, 10)}...`);
            // Clean up uploaded file if exists
            if (req.file && req.file.path) {
                asyncfs.unlink(req.file.path).catch(err => 
                    console.error('[Cleanup] Failed to delete temp file:', err)
                );
            }
            return res.status(401).json({ error: "Invalid authentication" }).end();
        }

        // Generate the payload_fire_id and session token
        const payload_fire_id = uuidv4();
        const session_token = crypto.randomBytes(32).toString('hex');

        // Mark probe secret as used and store session token with initial activity
        await probe_token.update({
            used: true,
            session_token: session_token,
            payload_fire_id: payload_fire_id,
            last_activity: new Date()
        });

        // Look up correlated request data if injection key is provided
        let injection_data = {};
        if (req.body.injection_key) {
            try {
                const injection_request = await InjectionRequests.findOne({
                    where: {
                        injection_key: req.body.injection_key
                    }
                });
                if (injection_request) {
                    injection_data.request = injection_request.request;
                    injection_data.injection_timestamp = injection_request.createdAt;
                }
            } catch (error) {
                console.error("Error retrieving injection for key", error);
            }
        }

        // Store the payload data
        const payload_fire_result = {
            id: payload_fire_id,
            probe_secret: req.body.probe_secret,
        url: req.body.uri || '',
        ip_address: req.ip,
        referer: req.body.referrer || '',
        user_agent: req.body['user-agent'] || '',
        cookies: req.body.cookies || '',
        title: req.body.title || '',
        dom: req.body.dom || '',
        text: req.body.text || '',
        origin: req.body.origin || '',
        screenshot_id: payload_fire_id,
        was_iframe: (req.body.was_iframe === 'true'),
        browser_timestamp: parseInt(req.body['browser-time']) || 0,
        correlated_request: injection_data.request || 'No correlated request found for this payload',
        probe_uid: req.body['probe-uid'] || '',
        local_storage: req.body.localStorage || '[]',
        session_storage: req.body.sessionStorage || '[]',
        custom_data: req.body.custom_data || '[]'
    };

    // Handle screenshot upload if present (from multer upload.single('screenshot'))
    if (req.file) {
        const multer_temp_image_path = req.file.path;
        const payload_fire_image_filename = `${payload_fire_id}.png.gz`;
        const payload_fire_image_filename_path = `${SCREENSHOTS_DIR}/${payload_fire_image_filename}`;
        
        // Ensure screenshots directory exists
        try {
            await asyncfs.mkdir(SCREENSHOTS_DIR, { recursive: true });
        } catch (err) {
            console.error('[Screenshot] Error creating directory:', err);
        }
        
        // Compress and save the screenshot
        const gzip = zlib.createGzip();
        const output_gzip_stream = fs.createWriteStream(payload_fire_image_filename_path);
        const input_read_stream = fs.createReadStream(multer_temp_image_path);
        
        input_read_stream.pipe(gzip).pipe(output_gzip_stream).on('finish', async (error) => {
                if (error) {
                    console.error(`[Screenshot] Error writing screenshot:`, error);
                } else {
                    console.log(`[Screenshot] Saved screenshot for payload ${payload_fire_id}`);
                }
                
                // Clean up temp file
                try {
                    await asyncfs.unlink(multer_temp_image_path);
                } catch (unlinkError) {
                    console.error(`[Screenshot] Failed to delete temp file:`, unlinkError);
                }
            });
        }

        await PayloadFireResults.create(payload_fire_result);

        // Send notifications independently so one failure doesn't block the other
        // Check if email notifications are enabled
        if (process.env.SMTP_EMAIL_NOTIFICATIONS_ENABLED === 'true') {
            notification.send_email_notification(payload_fire_result)
                .then(() => console.log('[Notification] Email sent successfully'))
                .catch(error => console.error('[Notification] Email failed:', error.message));
        }
        
        // Check if Discord notifications are enabled
        if (process.env.DISCORD_WEBHOOK_URL && process.env.DISCORD_WEBHOOK_URL.trim() !== '') {
            notification.send_discord_notification(payload_fire_result)
                .then(() => console.log('[Notification] Discord sent successfully'))
                .catch(error => console.error('[Notification] Discord failed:', error.message));
        }

        // Return payload ID and session token for subsequent requests
        res.status(200).json({
            status: "success",
            payload_id: payload_fire_id,
            session_token: session_token
        }).end();

    } catch (error) {
        console.error('[js_callback] Error processing callback:', error);
        // Ensure we don't leave the response hanging
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error" }).end();
        }
    }
}

module.exports = {
    handleJSCallback
};
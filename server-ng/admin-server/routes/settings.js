/**
 * Settings management routes
 */

const express = require('express');
const router = express.Router();
const { validate } = require('express-jsonschema');

const database = require('../../shared/database.js');
const Settings = database.Settings;
const update_settings_value = database.update_settings_value;
const constants = require('../../shared/constants.js');
const { UpdateConfigSchema } = require('../middleware/validation');
const { get_hashed_password, get_secure_random_string } = require('../../shared/utils/crypto-utils.js');
const { reinitializeSessionMiddleware } = require('../middleware/session.js');

/**
 * GET /api/v1/settings
 * Get current settings
 */
router.get('/', async (req, res) => {
    const settings_to_retrieve = [
        {
            key: constants.CORRELATION_API_SECRET_SETTINGS_KEY,
            return_key: 'correlation_api_key',
            default: '',
            formatter: false,
        },
        {
            key: constants.CHAINLOAD_URI_SETTINGS_KEY,
            return_key: 'chainload_uri',
            default: '',
            formatter: false,
        },
        {
            key: constants.PAGES_TO_COLLECT_SETTINGS_KEY,
            return_key: 'pages_to_collect',
            default: [],
            formatter: ((value) => {
                return JSON.parse(value);
            }),
        },
        {
            key: constants.SEND_ALERT_EMAILS_KEY,
            return_key: 'send_alert_emails',
            default: true,
            formatter: ((value) => {
                return JSON.parse(value);
            }),
        },
        {
            key: constants.SEND_DISCORD_ALERTS_KEY,
            return_key: 'send_discord_alerts',
            default: true,
            formatter: ((value) => {
                return JSON.parse(value);
            }),
        },
    ];

    let result = {};
    
    // Add notification configuration status
    result.email_configured = process.env.SMTP_EMAIL_NOTIFICATIONS_ENABLED === "true";
    result.discord_configured = !!process.env.DISCORD_WEBHOOK_URL;
    
    let database_promises = settings_to_retrieve.map(async settings_value_metadata => {
        const db_record = await Settings.findOne({
            where: {
                key: settings_value_metadata.key
            }
        });

        const formatter_function = settings_value_metadata.formatter ? settings_value_metadata.formatter : (value) => value;
        result[settings_value_metadata.return_key] = db_record ? formatter_function(db_record.value) : settings_value_metadata.default;
    });
    await Promise.all(database_promises);

    res.status(200).json({
        'success': true,
        result
    }).end();
});

/**
 * PUT /api/v1/settings
 * Update settings
 */
router.put('/', validate({ body: UpdateConfigSchema }), async (req, res) => {
    if(req.body.password) {
        // Pull password record
        const admin_user_password = await Settings.findOne({
            where: {
                key: constants.ADMIN_PASSWORD_SETTINGS_KEY
            }
        });

        // Update password
        const bcrypt_hash = await get_hashed_password(req.body.password);
        admin_user_password.value = bcrypt_hash;
        await admin_user_password.save();
    }

    if(req.body.correlation_api_key === true) {
        const correlation_api_key = get_secure_random_string(64);
        await update_settings_value(
            constants.CORRELATION_API_SECRET_SETTINGS_KEY,
            correlation_api_key
        );
    }

    if(req.body.chainload_uri !== undefined) {
        await update_settings_value(
            constants.CHAINLOAD_URI_SETTINGS_KEY,
            req.body.chainload_uri
        );
    }

    if(req.body.send_alert_emails !== undefined) {
        await update_settings_value(
            constants.SEND_ALERT_EMAILS_KEY,
            JSON.stringify(req.body.send_alert_emails)
        );
    }

    if(req.body.send_discord_alerts !== undefined) {
        await update_settings_value(
            constants.SEND_DISCORD_ALERTS_KEY,
            JSON.stringify(req.body.send_discord_alerts)
        );
    }

    if(req.body.revoke_all_sessions === true) {
        const new_session_secret = get_secure_random_string(64);
        await update_settings_value(
            constants.session_secret_key,
            new_session_secret
        );
        // Reinitialize the session middleware with the new secret
        await reinitializeSessionMiddleware();
    }

    if(req.body.pages_to_collect !== undefined) {
        await update_settings_value(
            constants.PAGES_TO_COLLECT_SETTINGS_KEY,
            JSON.stringify(req.body.pages_to_collect)
        );
    }

    res.status(200).json({
        'success': true,
        'result': {}
    }).end();
});

module.exports = router;
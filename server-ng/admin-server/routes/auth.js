/**
 * Authentication routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { validate } = require('express-jsonschema');

const database = require('../../shared/database.js');
const Settings = database.Settings;
const constants = require('../../shared/constants.js');
const { LoginSchema } = require('../middleware/validation');

/**
 * GET /api/v1/auth-check
 * Check if user is authenticated
 */
router.get('/auth-check', async (req, res) => {
    res.status(200).json({
        "success": true,
        "result": {
            "is_authenticated": (req.session.authenticated === true)
        }
    }).end();
});

/**
 * POST /api/v1/login
 * Login to administrator account
 */
router.post('/login', validate({ body: LoginSchema }), async (req, res) => {
    const admin_user_password_record = await Settings.findOne({
        where: {
            key: constants.ADMIN_PASSWORD_SETTINGS_KEY
        }
    });
    const admin_password_hash = admin_user_password_record.value;

    // Compare user-provided password against admin password hash
    const password_matches = await bcrypt.compare(
        req.body.password,
        admin_password_hash,
    );

    if (!password_matches) {
        res.status(200).json({
            "success": false,
            "error": "Incorrect password, please try again.",
            "code": "INVALID_CREDENTIALS"
        }).end();
        return;
    }

    // Set session data to set user as authenticated
    req.session.authenticated = true;

    res.status(200).json({
        "success": true,
        "result": {}
    }).end();
});

module.exports = router;
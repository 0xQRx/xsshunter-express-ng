/**
 * Injection correlation routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { validate } = require('express-jsonschema');
const safeCompare = require('safe-compare');

const database = require('../../shared/database.js');
const Settings = database.Settings;
const InjectionRequests = database.InjectionRequests;
const constants = require('../../shared/constants.js');
const { RecordCorrelatedRequestSchema } = require('../middleware/validation');

/**
 * POST /api/v1/record_injection
 * Record correlated injection request
 * Authentication is custom for this endpoint (uses correlation API key)
 */
router.post('/record_injection', validate({ body: RecordCorrelatedRequestSchema }), async (req, res) => {
    const correlation_key_record = await Settings.findOne({
        where: {
            key: constants.CORRELATION_API_SECRET_SETTINGS_KEY
        }
    });

    if (!safeCompare(correlation_key_record.value, req.body.owner_correlation_key)) {
        res.status(200).json({
            "success": false,
            "error": "Invalid authentication provided. Please provide a proper correlation API key.",
            "code": "INVALID_CREDENTIALS"
        }).end();
        return;
    }

    try {
        // Create injection correlation record
        await InjectionRequests.create({
            id: uuidv4(),
            request: req.body.request,
            injection_key: req.body.injection_key,
        });
    } catch (e) {
        if(e.name === 'SequelizeUniqueConstraintError') {
            res.status(200).json({
                "success": false,
                "error": "That injection key has already been used previously.",
                "code": "EXISTING_INJECTION_KEY"
            }).end();
            return;
        }
        // Log error in development, but don't expose details to client
        if (process.env.NODE_ENV === 'development') {
            console.error('[Injection Route] Database error:', e);
        }
        res.status(200).json({
            "success": false,
            "error": "An unexpected error occurred.",
            "code": "DATABASE_ERROR"
        }).end();
        return;
    }

    res.status(200).json({
        "success": true,
        "message": "Injection request successfully recorded!"
    }).end();
});

/**
 * POST /api/v1/generate-test-token
 * Generate a test token for probe testing (authenticated)
 */
router.post('/generate-test-token', async (req, res) => {
    // Authentication is now handled by the requireAuth middleware
    try {
        // Generate a secure random token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        
        // Store token with timestamp in app.locals.testTokens Map
        if (!req.app.locals.testTokens) {
            req.app.locals.testTokens = new Map();
        }
        req.app.locals.testTokens.set(token, Date.now());

        res.status(200).json({
            "success": true,
            "token": token
        }).end();
    } catch (error) {
        console.error('Error generating test token:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to generate test token"
        }).end();
    }
});

module.exports = router;
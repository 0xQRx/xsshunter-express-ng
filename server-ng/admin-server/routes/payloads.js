/**
 * Payload management routes
 */

const express = require('express');
const router = express.Router();
const { validate } = require('express-jsonschema');

const database = require('../../shared/database.js');
const Payloads = database.Payloads;
const { CreatePayloadSchema, UpdatePayloadSchema } = require('../middleware/validation');
const { minifyAndEncodePayload } = require('../../shared/utils/payload-utils.js');

/**
 * GET /api/v1/payloads
 * List all payloads
 */
router.get('/', async (req, res) => {
    try {
        const payloads = await Payloads.findAll({
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            "success": true,
            "payloads": payloads
        }).end();
    } catch (error) {
        console.error('Error fetching payloads:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to fetch payloads"
        }).end();
    }
});

/**
 * GET /api/v1/payloads/:id
 * Get single payload by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const payload = await Payloads.findByPk(req.params.id);
        
        if (!payload) {
            res.status(404).json({
                "success": false,
                "error": "Payload not found"
            }).end();
            return;
        }

        res.status(200).json({
            "success": true,
            "payload": payload
        }).end();
    } catch (error) {
        console.error('Error fetching payload:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to fetch payload"
        }).end();
    }
});

/**
 * POST /api/v1/payloads
 * Create new payload
 */
router.post('/', validate({ body: CreatePayloadSchema }), async (req, res) => {
    try {
        // Minify and encode the payload if it's JavaScript
        let minifiedCode = '';
        if (req.body.code && (!req.body.type || req.body.type === 'javascript')) {
            minifiedCode = await minifyAndEncodePayload(req.body.code);
        }
        
        const payload = await Payloads.create({
            name: req.body.name,
            description: req.body.description || '',
            code: req.body.code,
            minified_code: minifiedCode,
            type: req.body.type || 'javascript',
            author: req.body.author || '',
            risk_level: req.body.risk_level || 'medium',
            category: req.body.category || '',
            is_active: req.body.is_active !== undefined ? req.body.is_active : true
        });

        res.status(201).json({
            "success": true,
            "payload": payload
        }).end();
    } catch (error) {
        console.error('Error creating payload:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to create payload"
        }).end();
    }
});

/**
 * PUT /api/v1/payloads/:id
 * Update payload
 */
router.put('/:id', validate({ body: UpdatePayloadSchema }), async (req, res) => {
    try {
        const payload = await Payloads.findByPk(req.params.id);
        
        if (!payload) {
            res.status(404).json({
                "success": false,
                "error": "Payload not found"
            }).end();
            return;
        }

        // Prepare update data
        const updateData = {};
        
        // Map fields from request
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.type !== undefined) updateData.type = req.body.type;
        if (req.body.author !== undefined) updateData.author = req.body.author;
        if (req.body.risk_level !== undefined) updateData.risk_level = req.body.risk_level;
        if (req.body.category !== undefined) updateData.category = req.body.category;
        if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
        
        // Handle code field
        if (req.body.code !== undefined) {
            updateData.code = req.body.code;
            
            // If code is being updated and it's JavaScript, minify and encode it
            if (req.body.code && (!req.body.type || req.body.type === 'javascript')) {
                updateData.minified_code = await minifyAndEncodePayload(req.body.code);
            }
        }
        
        await payload.update(updateData);

        res.status(200).json({
            "success": true,
            "payload": payload
        }).end();
    } catch (error) {
        console.error('Error updating payload:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to update payload"
        }).end();
    }
});

/**
 * DELETE /api/v1/payloads/:id
 * Delete payload
 */
router.delete('/:id', async (req, res) => {
    try {
        const payload = await Payloads.findByPk(req.params.id);
        
        if (!payload) {
            res.status(404).json({
                "success": false,
                "error": "Payload not found"
            }).end();
            return;
        }

        await payload.destroy();

        res.status(200).json({
            "success": true,
            "message": "Payload deleted successfully"
        }).end();
    } catch (error) {
        console.error('Error deleting payload:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to delete payload"
        }).end();
    }
});

module.exports = router;
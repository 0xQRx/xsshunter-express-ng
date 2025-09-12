/**
 * Extension management routes
 */

const express = require('express');
const router = express.Router();
const { validate } = require('express-jsonschema');

const database = require('../../shared/database.js');
const Extensions = database.Extensions;
const { CreateExtensionSchema, UpdateExtensionSchema } = require('../middleware/validation');
const { minifyAndEncodeExtension } = require('../../shared/utils/extension-utils.js');

/**
 * GET /api/v1/extensions
 * List all extensions
 */
router.get('/', async (req, res) => {
    try {
        const extensions = await Extensions.findAll({
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            "success": true,
            "extensions": extensions
        }).end();
    } catch (error) {
        console.error('Error fetching extensions:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to fetch extensions"
        }).end();
    }
});

/**
 * GET /api/v1/extensions/:id
 * Get single extension by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const extension = await Extensions.findByPk(req.params.id);
        
        if (!extension) {
            res.status(404).json({
                "success": false,
                "error": "Extension not found"
            }).end();
            return;
        }

        res.status(200).json({
            "success": true,
            "extension": extension
        }).end();
    } catch (error) {
        console.error('Error fetching extension:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to fetch extension"
        }).end();
    }
});

/**
 * POST /api/v1/extensions
 * Create new extension
 */
router.post('/', validate({ body: CreateExtensionSchema }), async (req, res) => {
    try {
        // Minify and encode the extension if it's JavaScript
        let minifiedCode = '';
        if (req.body.code && (!req.body.type || req.body.type === 'javascript')) {
            minifiedCode = await minifyAndEncodeExtension(req.body.code);
        }
        
        const extension = await Extensions.create({
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
            "extension": extension
        }).end();
    } catch (error) {
        console.error('Error creating extension:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to create extension"
        }).end();
    }
});

/**
 * PUT /api/v1/extensions/:id
 * Update extension
 */
router.put('/:id', validate({ body: UpdateExtensionSchema }), async (req, res) => {
    try {
        const extension = await Extensions.findByPk(req.params.id);
        
        if (!extension) {
            res.status(404).json({
                "success": false,
                "error": "Extension not found"
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
                updateData.minified_code = await minifyAndEncodeExtension(req.body.code);
            }
        }
        
        await extension.update(updateData);

        res.status(200).json({
            "success": true,
            "extension": extension
        }).end();
    } catch (error) {
        console.error('Error updating extension:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to update extension"
        }).end();
    }
});

/**
 * DELETE /api/v1/extensions/:id
 * Delete extension
 */
router.delete('/:id', async (req, res) => {
    try {
        const extension = await Extensions.findByPk(req.params.id);
        
        if (!extension) {
            res.status(404).json({
                "success": false,
                "error": "Extension not found"
            }).end();
            return;
        }

        await extension.destroy();

        res.status(200).json({
            "success": true,
            "message": "Extension deleted successfully"
        }).end();
    } catch (error) {
        console.error('Error deleting extension:', error);
        res.status(500).json({
            "success": false,
            "error": "Failed to delete extension"
        }).end();
    }
});

module.exports = router;
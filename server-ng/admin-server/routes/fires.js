/**
 * Payload fire management routes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const asyncfs = require('fs').promises;
const { validate } = require('express-jsonschema');
const { Op } = require("sequelize");

const database = require('../../shared/database.js');
const config = require('../../shared/config.js');
const PayloadFireResults = database.PayloadFireResults;
const { DeletePayloadFiresSchema, ListPayloadFiresSchema } = require('../middleware/validation');

const SCREENSHOTS_DIR = path.resolve(config.storage.screenshotsDir);

/**
 * GET /api/v1/payloadfires
 * List XSS payload fire results
 */
router.get('/', validate({ query: ListPayloadFiresSchema }), async (req, res) => {
    const page = (parseInt(req.query.page) - 1);
    const limit = parseInt(req.query.limit);
    const offset = (page * limit);
    const payload_fires = await PayloadFireResults.findAndCountAll({
        limit: limit,
        offset: (page * limit),
        order: [['createdAt', 'DESC']],
    });

    // Parse local_storage and session_storage
    const parsed_payload_fires = payload_fires.rows.map((payload_fire) => {
        const parsed_data = {
            ...payload_fire.toJSON(), // Convert Sequelize model instance to a plain object
            local_storage: JSON.parse(payload_fire.local_storage || '[]'),
            session_storage: JSON.parse(payload_fire.session_storage || '[]'),
        };
        return parsed_data;
    });

    res.status(200).json({
        'success': true,
        'result': {
            'payload_fires': parsed_payload_fires,
            'total': payload_fires.count
        }
    }).end();
});

/**
 * DELETE /api/v1/payloadfires
 * Delete XSS payload fire(s)
 */
router.delete('/', validate({ body: DeletePayloadFiresSchema }), async (req, res) => {
    const ids_to_delete = req.body.ids;

    // Pull the corresponding screenshot_ids from the DB so
    // we can delete all the payload fire images as well as
    // the payload records themselves.
    const screenshot_id_records = await PayloadFireResults.findAll({
        where: {
            id: {
                [Op.in]: ids_to_delete
            }
        },
        attributes: ['id', 'screenshot_id']
    });
    const screenshots_to_delete = screenshot_id_records.map(payload => {
        return `${SCREENSHOTS_DIR}/${payload.screenshot_id}.png.gz`;
    });

    // Remove the records first so a missing or undeletable
    // screenshot can never leave a record stuck in the UI.
    const payload_fires = await PayloadFireResults.destroy({
        where: {
            id: {
                [Op.in]: ids_to_delete
            }
        }
    });

    // Screenshots may not exist (no screenshot uploaded, or
    // already removed from disk), so ignore ENOENT.
    await Promise.all(screenshots_to_delete.map(async screenshot_path => {
        try {
            await asyncfs.unlink(screenshot_path);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`[Delete] Failed to remove screenshot ${screenshot_path}:`, error.message);
            }
        }
    }));

    res.status(200).json({
        'success': true,
        'result': {}
    }).end();
});

module.exports = router;
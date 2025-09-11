/**
 * Collected pages management routes
 */

const express = require('express');
const router = express.Router();
const { validate } = require('express-jsonschema');
const { Op } = require("sequelize");

const database = require('../../shared/database.js');
const CollectedPages = database.CollectedPages;
const { ListCollectedPagesSchema, DeleteCollectedPagesSchema } = require('../middleware/validation');

/**
 * GET /api/v1/collected_pages
 * List collected pages
 */
router.get('/', validate({ query: ListCollectedPagesSchema }), async (req, res) => {
    const page = (parseInt(req.query.page) - 1);
    const limit = parseInt(req.query.limit);
    const offset = (page * limit);
    const collected_pages = await CollectedPages.findAndCountAll({
        limit: limit,
        offset: (page * limit),
        order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
        'success': true,
        'result': {
            'collected_pages': collected_pages.rows,
            'total': collected_pages.count
        }
    }).end();
});

/**
 * DELETE /api/v1/collected_pages
 * Delete collected page(s)
 */
router.delete('/', validate({ body: DeleteCollectedPagesSchema }), async (req, res) => {
    const ids_to_delete = req.body.ids;
    const payload_fires = await CollectedPages.destroy({
        where: {
            id: {
                [Op.in]: ids_to_delete
            }
        }
    });

    res.status(200).json({
        'success': true,
        'result': {}
    }).end();
});

module.exports = router;
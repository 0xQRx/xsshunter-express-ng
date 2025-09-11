/**
 * Screenshot retrieval routes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const asyncfs = require('fs').promises;
const fs = require('fs');
const config = require('../../shared/config.js');

const SCREENSHOTS_DIR = path.resolve(config.storage.screenshotsDir);
const SCREENSHOT_FILENAME_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\.png$/i);

/**
 * Check if file exists
 */
async function check_file_exists(file_path) {
    try {
        await asyncfs.access(file_path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * GET /screenshots/:screenshotFilename
 * Retrieve a screenshot by filename
 */
router.get('/:screenshotFilename', async (req, res) => {
    const screenshot_filename = req.params.screenshotFilename;

    // Validate filename format for security
    if (!SCREENSHOT_FILENAME_REGEX.test(screenshot_filename)) {
        return res.sendStatus(404);
    }

    const gz_image_path = `${SCREENSHOTS_DIR}/${screenshot_filename}.gz`;
    
    const image_exists = await check_file_exists(gz_image_path);

    if (!image_exists) {
        return res.sendStatus(404);
    }

    // Return the gzipped image file
    res.sendFile(gz_image_path, {
        lastModified: false,
        acceptRanges: false,
        cacheControl: true,
        headers: {
            "Content-Type": "image/png",
            "Content-Encoding": "gzip"
        }
    });
});

module.exports = router;
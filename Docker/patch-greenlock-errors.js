#!/usr/bin/env node
// Patch Greenlock http-middleware to suppress common network disconnection errors

const fs = require('fs');
const path = require('path');

const filePath = '/app/server-ng/node_modules/@root/greenlock-express/http-middleware.js';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Backup original
fs.writeFileSync(filePath + '.backup', content);

// Find and replace the explainError function to filter out ECONNRESET errors
const original = `function explainError(gl, err, ctx, hostname) {
    if (!err.servername) {
        err.servername = hostname;
    }
    if (!err.context) {
        err.context = ctx;
    }
    // leaving this in the build for now because it will help with existing error reports
    console.error("[warning] network connection error:", (err.context || "") + " " + err.message);
    (gl.notify || gl._notify)("error", err);
    return err;
}`;

const patched = `function explainError(gl, err, ctx, hostname) {
    if (!err.servername) {
        err.servername = hostname;
    }
    if (!err.context) {
        err.context = ctx;
    }
    // PATCHED: Suppress common network disconnection errors (ECONNRESET, EPIPE, etc.)
    // These are normal when clients disconnect and don't need to be logged or notified
    var suppressedErrors = ['ECONNRESET', 'EPIPE', 'ECANCELED'];
    if (suppressedErrors.indexOf(err.code) === -1) {
        // Only log and notify for errors that aren't normal disconnections
        console.error("[warning] network connection error:", (err.context || "") + " " + err.message);
        (gl.notify || gl._notify)("error", err);
    }
    return err;
}`;

// Replace the function
if (content.includes(original)) {
    content = content.replace(original, patched);
    fs.writeFileSync(filePath, content);
    console.log('[Patch] Greenlock http-middleware patched successfully to suppress ECONNRESET errors');
} else {
    console.log('[Patch] Warning: Could not find expected code to patch in http-middleware');
    console.log('[Patch] http-middleware may have already been patched or has a different version');
}

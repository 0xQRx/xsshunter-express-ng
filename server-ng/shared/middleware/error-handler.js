/**
 * Centralized error handling middleware
 * Provides consistent error responses across both servers
 */

const config = require('../config');

/**
 * Error handler middleware
 * Should be added last in the middleware chain
 */
function errorHandler(err, req, res, next) {
    // Log the error
    console.error('[Error Handler]', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        error: err.message,
        stack: config.isDevelopment ? err.stack : undefined
    });
    
    // Always set CORS headers for error responses (important for XSS callbacks)
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    
    // Handle specific error types
    if (err.name === 'JsonSchemaValidation') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: config.isDevelopment ? err.validations : undefined
        });
    }
    
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Database validation failed',
            code: 'DB_VALIDATION_ERROR',
            details: config.isDevelopment ? err.errors : undefined
        });
    }
    
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            success: false,
            error: 'Resource already exists',
            code: 'DUPLICATE_RESOURCE'
        });
    }
    
    if (err.name === 'SequelizeDatabaseError') {
        return res.status(500).json({
            success: false,
            error: 'Database error',
            code: 'DATABASE_ERROR'
        });
    }
    
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            code: 'UNAUTHORIZED'
        });
    }
    
    if (err.name === 'ForbiddenError' || err.status === 403) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            code: 'FORBIDDEN'
        });
    }
    
    if (err.name === 'NotFoundError' || err.status === 404) {
        return res.status(404).json({
            success: false,
            error: 'Resource not found',
            code: 'NOT_FOUND'
        });
    }
    
    // Handle multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large',
            code: 'FILE_TOO_LARGE'
        });
    }
    
    // Default error response
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: config.isDevelopment ? err.message : 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        stack: config.isDevelopment ? err.stack : undefined
    });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncWrapper(fn) {
    return function(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Not found handler
 * Catches 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.path
    });
}

module.exports = {
    errorHandler,
    asyncWrapper,
    notFoundHandler
};
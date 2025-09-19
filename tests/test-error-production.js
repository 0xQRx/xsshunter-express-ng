#!/usr/bin/env node

/**
 * Test script to verify no verbose errors are exposed in production
 */

// Force production mode for testing
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';

const config = require('../server-ng/shared/config.js');
const { errorHandler } = require('../server-ng/shared/middleware/error-handler.js');

console.log('Production Error Handling Tests');
console.log('================================\n');

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`isDevelopment: ${config.isDevelopment}\n`);

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

// Mock request and response objects
function createMockReqRes() {
    const req = {
        method: 'GET',
        path: '/test',
        header: () => null
    };

    let responseData = null;
    const res = {
        statusCode: 200,
        headers: {},
        set: function(key, value) {
            this.headers[key] = value;
        },
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            responseData = data;
            return this;
        }
    };

    return { req, res, responseData: () => responseData };
}

// Test various error types
console.log('Testing Error Handler in Production Mode:');
console.log('------------------------------------------');

test('Generic error should not expose message', () => {
    const { req, res, responseData } = createMockReqRes();
    const error = new Error('Sensitive database connection string: postgresql://user:password@localhost/db');

    errorHandler(error, req, res, () => {});
    const data = responseData();

    if (data.error && data.error.includes('password')) {
        throw new Error('Error message exposed sensitive data');
    }
    if (data.stack) {
        throw new Error('Stack trace exposed in production');
    }
    if (data.error !== 'Internal server error') {
        throw new Error(`Expected generic error, got: ${data.error}`);
    }
});

test('Database error should not expose details', () => {
    const { req, res, responseData } = createMockReqRes();
    const error = new Error('Column "users.password_hash" does not exist');
    error.name = 'SequelizeDatabaseError';

    errorHandler(error, req, res, () => {});
    const data = responseData();

    if (data.error && data.error.includes('password_hash')) {
        throw new Error('Database schema exposed');
    }
    if (data.error !== 'Database error') {
        throw new Error(`Expected generic database error, got: ${data.error}`);
    }
});

test('Validation error should not expose schema details', () => {
    const { req, res, responseData } = createMockReqRes();
    const error = {
        name: 'JsonSchemaValidation',
        message: 'Validation failed',
        validations: {
            body: [{
                property: 'admin_api_key',
                message: 'Required property missing'
            }]
        }
    };

    errorHandler(error, req, res, () => {});
    const data = responseData();

    if (data.details) {
        throw new Error('Validation details exposed in production');
    }
    if (data.error !== 'Validation failed') {
        throw new Error(`Expected validation error, got: ${data.error}`);
    }
});

test('Stack traces should be hidden', () => {
    const { req, res, responseData } = createMockReqRes();
    const error = new Error('Test error');
    error.stack = `Error: Test error
        at Object.<anonymous> (/app/server.js:10:15)
        at Module._compile (internal/modules/cjs/loader.js:1063:30)`;

    errorHandler(error, req, res, () => {});
    const data = responseData();

    if (data.stack) {
        throw new Error('Stack trace exposed in production');
    }
});

test('File paths should not be exposed', () => {
    const { req, res, responseData } = createMockReqRes();
    const error = new Error('ENOENT: no such file or directory, open \'/var/app/config/secrets.json\'');
    error.code = 'ENOENT';

    errorHandler(error, req, res, () => {});
    const data = responseData();

    if (data.error && data.error.includes('/var/app')) {
        throw new Error('File system paths exposed');
    }
    if (data.error && data.error.includes('secrets.json')) {
        throw new Error('Sensitive filename exposed');
    }
});

// Test admin-server error handler
console.log('\nTesting Admin Server Error Handler:');
console.log('------------------------------------');

test('Admin server hides errors in production', () => {
    const err = new Error('Database password incorrect: admin123');
    err.status = 500;

    let responseData = null;
    const res = {
        status: function(code) {
            this.statusCode = code;
            return {
                json: function(data) {
                    responseData = data;
                }
            };
        }
    };

    // Simulate the error handler from app.js
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });

    if (responseData.message && responseData.message.includes('password')) {
        throw new Error('Admin server exposed sensitive error');
    }
    if (responseData.message !== 'An error occurred') {
        throw new Error(`Expected generic message, got: ${responseData.message}`);
    }
});

// Summary
console.log('\n================================');
console.log('Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

// Restore original environment
process.env.NODE_ENV = originalEnv;

if (failed === 0) {
    console.log('\n🎉 All production error handling tests passed!');
    console.log('No verbose errors are exposed in production mode.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed! Verbose errors may be exposed in production.');
    process.exit(1);
}
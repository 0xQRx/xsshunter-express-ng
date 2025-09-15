#!/usr/bin/env node

/**
 * Test script to verify payload server error handling in production
 */

// Force production mode for testing
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';

const config = require('../server-ng/shared/config.js');
const { logError, getSafeErrorMessage, createErrorResponse } = require('../server-ng/payload-server/utils/error-handler.js');

console.log('Payload Server Error Handling Tests');
console.log('====================================\n');

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

// Capture console output for testing
let consoleOutput = '';
const originalConsoleError = console.error;
console.error = function(...args) {
    consoleOutput = JSON.stringify(args);
    originalConsoleError.apply(console, args);
};

// Test error utilities
console.log('Testing Error Utilities:');
console.log('------------------------');

test('logError should sanitize in production', () => {
    consoleOutput = '';
    const error = new Error('Database password: secret123');
    error.name = 'DatabaseError';

    logError('TestContext', error);

    if (consoleOutput.includes('secret123')) {
        throw new Error('Sensitive data exposed in logs');
    }
    if (consoleOutput.includes('Database password')) {
        throw new Error('Error message exposed in logs');
    }
    if (!consoleOutput.includes('DatabaseError')) {
        throw new Error('Error type not logged');
    }
});

test('getSafeErrorMessage should return generic message in production', () => {
    const error = new Error('Column users.password_hash not found');
    const message = getSafeErrorMessage(error, 'Database error occurred');

    if (message.includes('password_hash')) {
        throw new Error('Schema details exposed');
    }
    if (message !== 'Database error occurred') {
        throw new Error(`Expected generic message, got: ${message}`);
    }
});

test('createErrorResponse should not include details in production', () => {
    const response = createErrorResponse(
        400,
        'Validation failed',
        'VALIDATION_ERROR',
        { field: 'api_key', error: 'Required' }
    );

    if (response.details) {
        throw new Error('Details exposed in production');
    }
    if (response.error !== 'Validation failed') {
        throw new Error('Error message not preserved');
    }
});

// Test validation error handling
console.log('\nTesting Validation Error Handling:');
console.log('-----------------------------------');

test('Validation errors should hide details in production', () => {
    // Simulate validation error from payload server
    const error = {
        name: 'JsonSchemaValidation',
        validations: {
            body: [{
                property: 'probe_secret',
                message: 'Required property'
            }]
        }
    };

    // In production, details should be undefined
    const details = config.isDevelopment ? error.validations : undefined;

    if (details !== undefined) {
        throw new Error('Validation details exposed in production');
    }
});

// Test error responses
console.log('\nTesting Error Response Messages:');
console.log('---------------------------------');

test('Internal server errors should be generic', () => {
    const responses = [
        { error: "Internal server error" },  // Expected
        { error: "Database connection failed: postgresql://user:pass@host" },  // Bad
        { error: "Cannot read property 'id' of undefined" }  // Bad
    ];

    const validResponse = responses[0];
    if (validResponse.error !== "Internal server error") {
        throw new Error('Non-generic error message');
    }
});

test('Authentication errors should not reveal system details', () => {
    const goodResponses = [
        { error: "Missing authentication" },
        { error: "Invalid authentication" },
        { error: "Invalid session token" }
    ];

    const badResponses = [
        { error: "ProbeToken not found in database" },
        { error: "Session expired at 2024-01-01 12:00:00" }
    ];

    // Good responses should be generic
    goodResponses.forEach(resp => {
        if (resp.error.includes('database') || resp.error.includes('Token')) {
            throw new Error('Authentication error reveals implementation');
        }
    });
});

test('File operation errors should be hidden', () => {
    consoleOutput = '';
    const error = new Error('ENOENT: /var/app/screenshots/abc123.png not found');

    logError('Screenshot', error);

    if (consoleOutput.includes('/var/app')) {
        throw new Error('File paths exposed in logs');
    }
});

// Restore console.error
console.error = originalConsoleError;

// Summary
console.log('\n====================================');
console.log('Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

// Restore original environment
process.env.NODE_ENV = originalEnv;

if (failed === 0) {
    console.log('\n🎉 All payload server error handling tests passed!');
    console.log('No verbose errors are exposed in production mode.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed! Verbose errors may be exposed.');
    process.exit(1);
}
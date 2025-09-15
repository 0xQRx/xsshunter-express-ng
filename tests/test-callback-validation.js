#!/usr/bin/env node

/**
 * Test script to verify callback validation works correctly
 */

const {
    validateJSON,
    ensureString,
    validateUUID,
    validateSessionToken,
    validateBackgroundData,
    validatePageData
} = require('../server-ng/shared/utils/validation.js');

console.log('Callback Validation Tests');
console.log('=========================\n');

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

// Test UUID validation
console.log('Testing UUID Validation:');
console.log('------------------------');

test('Valid UUID', () => {
    const valid = validateUUID('550e8400-e29b-41d4-a716-446655440000');
    if (!valid) throw new Error('Expected valid UUID');
});

test('Invalid UUID - wrong format', () => {
    const valid = validateUUID('not-a-uuid');
    if (valid) throw new Error('Expected invalid UUID');
});

test('Invalid UUID - missing segments', () => {
    const valid = validateUUID('550e8400-e29b-41d4');
    if (valid) throw new Error('Expected invalid UUID');
});

// Test Session Token validation
console.log('\nTesting Session Token Validation:');
console.log('----------------------------------');

test('Valid session token', () => {
    const token = 'a'.repeat(64);
    const valid = validateSessionToken(token);
    if (!valid) throw new Error('Expected valid token');
});

test('Invalid token - too short', () => {
    const token = 'a'.repeat(32);
    const valid = validateSessionToken(token);
    if (valid) throw new Error('Expected invalid token');
});

test('Invalid token - non-hex characters', () => {
    const token = 'z'.repeat(64);
    const valid = validateSessionToken(token);
    if (valid) throw new Error('Expected invalid token');
});

// Test Background Data validation
console.log('\nTesting Background Data Validation:');
console.log('------------------------------------');

test('Valid background data with object', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: { key: 'value', number: 123 }
    };
    const result = validateBackgroundData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.custom_data.key !== 'value') throw new Error('Custom data not preserved');
});

test('Valid background data with JSON string', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: '{"key":"value","number":123}'
    };
    const result = validateBackgroundData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.custom_data.key !== 'value') throw new Error('Custom data not parsed');
});

test('Invalid background data - malformed JSON', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: '{invalid json}'
    };
    const result = validateBackgroundData(data);
    if (result.valid) throw new Error('Expected invalid data');
    if (result.error !== 'Invalid JSON in custom_data') throw new Error('Wrong error message');
});

test('Invalid background data - missing fields', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000'
    };
    const result = validateBackgroundData(data);
    if (result.valid) throw new Error('Expected invalid data');
    if (result.error !== 'Missing required fields') throw new Error('Wrong error message');
});

test('Invalid background data - bad UUID', () => {
    const data = {
        payload_id: 'not-a-uuid',
        session_token: 'a'.repeat(64),
        custom_data: {}
    };
    const result = validateBackgroundData(data);
    if (result.valid) throw new Error('Expected invalid data');
    if (result.error !== 'Invalid payload ID format') throw new Error('Wrong error message');
});

// Test Page Data validation
console.log('\nTesting Page Data Validation:');
console.log('------------------------------');

test('Valid page data', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        uri: 'https://example.com',
        html: '<html><body>Test</body></html>'
    };
    const result = validatePageData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.uri !== 'https://example.com') throw new Error('URI not preserved');
    if (result.data.html !== '<html><body>Test</body></html>') throw new Error('HTML not preserved');
});

test('Valid page data with missing uri/html', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64)
    };
    const result = validatePageData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.uri !== '') throw new Error('Expected empty URI');
    if (result.data.html !== '') throw new Error('Expected empty HTML');
});

test('Invalid page data - missing auth', () => {
    const data = {
        uri: 'https://example.com',
        html: '<html></html>'
    };
    const result = validatePageData(data);
    if (result.valid) throw new Error('Expected invalid data');
    if (result.error !== 'Missing authentication') throw new Error('Wrong error message');
});

test('Large HTML content should not be truncated', () => {
    const largeHtml = '<div>' + 'a'.repeat(100000) + '</div>';
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        uri: 'https://example.com',
        html: largeHtml
    };
    const result = validatePageData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.html !== largeHtml) throw new Error('HTML was truncated');
});

// Summary
console.log('\n=========================');
console.log('Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n🎉 All callback validation tests passed!');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed!');
    process.exit(1);
}
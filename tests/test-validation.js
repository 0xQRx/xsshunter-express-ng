#!/usr/bin/env node

/**
 * Test script to verify probe data validation
 */

const {
    validateJSON,
    validateBoolean,
    validateInteger,
    ensureString,
    validateProbeData
} = require('../server-ng/shared/utils/validation.js');

console.log('Probe Data Validation Tests');
console.log('============================\n');

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

// Test validateJSON
console.log('Testing validateJSON:');
console.log('---------------------');

test('Valid JSON array', () => {
    const result = validateJSON('[1,2,3]', 'test');
    if (result !== '[1,2,3]') throw new Error(`Expected [1,2,3], got ${result}`);
});

test('Valid JSON object', () => {
    const result = validateJSON('{"key":"value"}', 'test');
    if (result !== '{"key":"value"}') throw new Error(`Expected {"key":"value"}, got ${result}`);
});

test('Invalid JSON returns default', () => {
    const result = validateJSON('{invalid json}', 'test', '[]');
    if (result !== '[]') throw new Error(`Expected [], got ${result}`);
});

test('Empty string returns default', () => {
    const result = validateJSON('', 'test', '{}');
    if (result !== '{}') throw new Error(`Expected {}, got ${result}`);
});

test('Malformed JSON with unclosed bracket', () => {
    const result = validateJSON('[1,2,3', 'test');
    if (result !== '[]') throw new Error(`Expected [], got ${result}`);
});

// Test validateBoolean
console.log('\nTesting validateBoolean:');
console.log('------------------------');

test('String "true" returns true', () => {
    if (validateBoolean('true') !== true) throw new Error('Expected true');
});

test('Boolean true returns true', () => {
    if (validateBoolean(true) !== true) throw new Error('Expected true');
});

test('String "false" returns false', () => {
    if (validateBoolean('false') !== false) throw new Error('Expected false');
});

test('Random string returns false', () => {
    if (validateBoolean('random') !== false) throw new Error('Expected false');
});

// Test validateInteger
console.log('\nTesting validateInteger:');
console.log('-------------------------');

test('Valid integer string', () => {
    if (validateInteger('123') !== 123) throw new Error('Expected 123');
});

test('Invalid integer returns default', () => {
    if (validateInteger('abc', 0) !== 0) throw new Error('Expected 0');
});

test('Float gets truncated to integer', () => {
    if (validateInteger('123.456') !== 123) throw new Error('Expected 123');
});

// Test ensureString
console.log('\nTesting ensureString:');
console.log('----------------------');

test('String returns as-is', () => {
    if (ensureString('test') !== 'test') throw new Error('Expected "test"');
});

test('Number converts to string', () => {
    if (ensureString(123) !== '123') throw new Error('Expected "123"');
});

test('Null returns empty string', () => {
    if (ensureString(null) !== '') throw new Error('Expected empty string');
});

test('Undefined returns empty string', () => {
    if (ensureString(undefined) !== '') throw new Error('Expected empty string');
});

// Test validateProbeData with malformed data
console.log('\nTesting validateProbeData with malformed data:');
console.log('------------------------------------------------');

test('Malformed localStorage JSON', () => {
    const data = {
        localStorage: '{"key": "value"',  // Missing closing brace
        sessionStorage: '[]',
        custom_data: '[]'
    };
    const result = validateProbeData(data);
    if (result.local_storage !== '[]') throw new Error('Expected default [] for malformed JSON');
});

test('Invalid sessionStorage JSON', () => {
    const data = {
        localStorage: '[]',
        sessionStorage: 'not json at all',
        custom_data: '[]'
    };
    const result = validateProbeData(data);
    if (result.session_storage !== '[]') throw new Error('Expected default [] for invalid JSON');
});

test('Mixed valid and invalid data', () => {
    const data = {
        uri: 'https://example.com',
        'user-agent': 'Mozilla/5.0',
        localStorage: '{"valid":"json"}',
        sessionStorage: '{invalid json}',
        custom_data: '[1,2,3]',
        was_iframe: 'true',
        'browser-time': '1234567890'
    };
    const result = validateProbeData(data);

    if (result.url !== 'https://example.com') throw new Error('URL not preserved');
    if (result.user_agent !== 'Mozilla/5.0') throw new Error('User agent not preserved');
    if (result.local_storage !== '{"valid":"json"}') throw new Error('Valid localStorage not preserved');
    if (result.session_storage !== '[]') throw new Error('Invalid sessionStorage not defaulted');
    if (result.custom_data !== '[1,2,3]') throw new Error('Valid custom_data not preserved');
    if (result.was_iframe !== true) throw new Error('was_iframe not converted to boolean');
    if (result.browser_timestamp !== 1234567890) throw new Error('browser_timestamp not converted to integer');
});

test('Extremely large but valid data', () => {
    const largeString = 'a'.repeat(100000);
    const data = {
        dom: largeString,
        cookies: largeString,
        text: largeString
    };
    const result = validateProbeData(data);

    // Should not truncate large fields
    if (result.dom !== largeString) throw new Error('DOM field was truncated');
    if (result.cookies !== largeString) throw new Error('Cookies field was truncated');
    if (result.text !== largeString) throw new Error('Text field was truncated');
});

// Summary
console.log('\n============================');
console.log('Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n🎉 All validation tests passed!');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed!');
    process.exit(1);
}
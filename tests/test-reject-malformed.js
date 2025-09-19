#!/usr/bin/env node

/**
 * Test script to verify malformed data is rejected (not stored with defaults)
 */

const { validateProbeData, validateBackgroundData } = require('../server-ng/shared/utils/validation.js');

console.log('Malformed Data Rejection Tests');
console.log('===============================\n');

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

// Test Main Callback Validation (validateProbeData)
console.log('Testing Main Callback - Reject Malformed Data:');
console.log('-----------------------------------------------');

test('Valid JSON in all fields - should be accepted', () => {
    const data = {
        localStorage: '{"key":"value"}',
        sessionStorage: '[]',
        custom_data: '{"test":123}'
    };
    const result = validateProbeData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.local_storage !== '{"key":"value"}') throw new Error('localStorage not preserved');
});

test('Malformed localStorage JSON - should be rejected', () => {
    const data = {
        localStorage: '{invalid json}',
        sessionStorage: '[]',
        custom_data: '[]'
    };
    const result = validateProbeData(data);
    if (result.valid) throw new Error('Expected rejection of malformed data');
    if (!result.errors || result.errors.length === 0) throw new Error('Expected error details');
    if (!result.errors[0].includes('localStorage')) throw new Error('Expected localStorage error');
});

test('Malformed sessionStorage JSON - should be rejected', () => {
    const data = {
        localStorage: '[]',
        sessionStorage: '[1,2,3,',  // Missing closing bracket
        custom_data: '[]'
    };
    const result = validateProbeData(data);
    if (result.valid) throw new Error('Expected rejection of malformed data');
    if (!result.errors[0].includes('sessionStorage')) throw new Error('Expected sessionStorage error');
});

test('Malformed custom_data JSON - should be rejected', () => {
    const data = {
        localStorage: '[]',
        sessionStorage: '[]',
        custom_data: 'not json at all'
    };
    const result = validateProbeData(data);
    if (result.valid) throw new Error('Expected rejection of malformed data');
    if (!result.errors[0].includes('custom_data')) throw new Error('Expected custom_data error');
});

test('Multiple malformed fields - should list all errors', () => {
    const data = {
        localStorage: '{bad}',
        sessionStorage: '[bad]',
        custom_data: '{also bad}'
    };
    const result = validateProbeData(data);
    if (result.valid) throw new Error('Expected rejection of malformed data');
    if (!result.errors || result.errors.length < 3) throw new Error('Expected multiple errors');
});

test('Empty strings should be accepted', () => {
    const data = {
        localStorage: '',
        sessionStorage: '',
        custom_data: ''
    };
    const result = validateProbeData(data);
    if (!result.valid) throw new Error('Expected empty strings to be valid');
    if (result.data.local_storage !== '[]') throw new Error('Expected default [] for empty localStorage');
    if (result.data.session_storage !== '[]') throw new Error('Expected default [] for empty sessionStorage');
    if (result.data.custom_data !== '[]') throw new Error('Expected default [] for empty custom_data');
});

test('Missing fields should be accepted with defaults', () => {
    const data = {};
    const result = validateProbeData(data);
    if (!result.valid) throw new Error('Expected missing fields to be valid');
    if (result.data.local_storage !== '[]') throw new Error('Expected default [] for missing localStorage');
});

// Test Background Callback Validation
console.log('\nTesting Background Callback - Reject Malformed Data:');
console.log('-----------------------------------------------------');

test('Valid JSON string in custom_data - should be accepted', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: '{"valid":"json"}'
    };
    const result = validateBackgroundData(data);
    if (!result.valid) throw new Error('Expected valid data');
    if (result.data.custom_data.valid !== 'json') throw new Error('custom_data not parsed');
});

test('Malformed JSON in custom_data - should be rejected', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: '{not valid json}'
    };
    const result = validateBackgroundData(data);
    if (result.valid) throw new Error('Expected rejection of malformed JSON');
    if (result.error !== 'Invalid JSON in custom_data') throw new Error('Expected specific error message');
});

test('Array instead of object in custom_data - should be rejected', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: '[1,2,3]'  // Array, not object
    };
    const result = validateBackgroundData(data);
    if (result.valid) throw new Error('Expected rejection of array');
    if (result.error !== 'Custom data must be a JSON object') throw new Error('Expected object requirement error');
});

test('Null custom_data - should be rejected', () => {
    const data = {
        payload_id: '550e8400-e29b-41d4-a716-446655440000',
        session_token: 'a'.repeat(64),
        custom_data: null
    };
    const result = validateBackgroundData(data);
    if (result.valid) throw new Error('Expected rejection of null');
    if (result.error !== 'Missing required fields') throw new Error(`Expected 'Missing required fields', got: ${result.error}`);
});

// Summary
console.log('\n===============================');
console.log('Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
    console.log('\n🎉 All rejection tests passed! Malformed data is properly rejected.');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed!');
    process.exit(1);
}
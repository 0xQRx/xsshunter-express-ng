#!/usr/bin/env node

/**
 * Test script to verify admin routes require authentication
 */

const routes_to_test = [
    // These should require authentication
    { path: '/api/v1/payloadfires', should_require_auth: true },
    { path: '/api/v1/collected_pages', should_require_auth: true },
    { path: '/api/v1/settings', should_require_auth: true },
    { path: '/api/v1/extensions', should_require_auth: true },
    { path: '/api/v1/generate-test-token', should_require_auth: true },
    { path: '/screenshots/test.png', should_require_auth: true },

    // These should NOT require authentication
    { path: '/api/v1/auth-check', should_require_auth: false },
    { path: '/api/v1/login', should_require_auth: false },
    { path: '/api/v1/record_injection', should_require_auth: false }, // Uses API key auth
    { path: '/health', should_require_auth: false },
];

console.log('Authentication Test Results:');
console.log('============================\n');

// Load the auth middleware
const auth = require('../server-ng/admin-server/middleware/auth.js');
const constants = require('../server-ng/shared/constants.js');

routes_to_test.forEach(route => {
    // Mock request and response objects
    const req = {
        path: route.path,
        session: { authenticated: false },
        header: () => 'test-csrf-header'
    };

    const res = {
        status: () => ({
            json: () => ({
                end: () => {}
            })
        })
    };

    let blocked = false;
    const next = () => { blocked = false; };

    // Override res.status to detect if auth blocked the request
    res.status = (code) => {
        if (code === 401) {
            blocked = true;
        }
        return {
            json: () => ({
                end: () => {}
            })
        };
    };

    // Test the requireAuth middleware
    auth.requireAuth(req, res, next);

    const status = blocked ? 'BLOCKED' : 'ALLOWED';
    const expected = route.should_require_auth ? 'BLOCKED' : 'ALLOWED';
    const result = status === expected ? '✅ PASS' : '❌ FAIL';

    console.log(`${result} ${route.path}`);
    console.log(`     Status: ${status} | Expected: ${expected}`);

    if (status !== expected) {
        console.log(`     ⚠️  Security issue: Route is ${status} but should be ${expected}`);
    }
    console.log('');
});

console.log('\nSummary:');
console.log('--------');
const passed = routes_to_test.filter((route, index) => {
    const req = {
        path: route.path,
        session: { authenticated: false },
        header: () => 'test-csrf-header'
    };

    let blocked = false;
    const res = {
        status: (code) => {
            if (code === 401) blocked = true;
            return { json: () => ({ end: () => {} }) };
        }
    };
    const next = () => { blocked = false; };

    auth.requireAuth(req, res, next);

    const status = blocked ? 'BLOCKED' : 'ALLOWED';
    const expected = route.should_require_auth ? 'BLOCKED' : 'ALLOWED';
    return status === expected;
}).length;

console.log(`Tests passed: ${passed}/${routes_to_test.length}`);

if (passed === routes_to_test.length) {
    console.log('✅ All admin routes are properly secured!');
    process.exit(0);
} else {
    console.log('❌ Some routes have authentication issues!');
    process.exit(1);
}
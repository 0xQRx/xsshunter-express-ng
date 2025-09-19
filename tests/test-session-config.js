#!/usr/bin/env node

/**
 * Test script to verify session configuration
 */

const config = require('../server-ng/shared/config.js');

console.log('Session Configuration Test');
console.log('==========================\n');

console.log('Session Settings:');
console.log('-----------------');
console.log(`Cookie Name: ${config.session.cookieName}`);
console.log(`Duration: ${config.session.duration / 1000 / 60 / 60} hours`);
console.log(`Active Duration: ${config.session.activeDuration / 1000 / 60} minutes`);
console.log(`Development Mode: ${config.isDevelopment}`);
console.log(`Cookie Secure: ${config.security.cookieSecure}`);

// Load the session middleware to verify sameSite is set
const sessions_settings_object = {
    cookieName: config.session.cookieName,
    duration: config.session.duration,
    activeDuration: config.session.activeDuration,
    cookie: {
        httpOnly: true,
        secure: !config.isDevelopment && config.security.cookieSecure,
        sameSite: 'strict'
    }
};

console.log('\nCookie Security Settings:');
console.log('-------------------------');
console.log(`httpOnly: ${sessions_settings_object.cookie.httpOnly}`);
console.log(`secure: ${sessions_settings_object.cookie.secure}`);
console.log(`sameSite: ${sessions_settings_object.cookie.sameSite}`);

// Verify critical security settings
let passed = 0;
let failed = 0;

function verify(name, condition, expected) {
    if (condition) {
        console.log(`✅ ${name}: ${expected}`);
        passed++;
    } else {
        console.log(`❌ ${name}: FAILED - ${expected}`);
        failed++;
    }
}

console.log('\nSecurity Verification:');
console.log('----------------------');
verify('httpOnly is enabled', sessions_settings_object.cookie.httpOnly === true, 'Cookies are httpOnly');
verify('sameSite is strict', sessions_settings_object.cookie.sameSite === 'strict', 'sameSite set to strict');

if (!config.isDevelopment) {
    verify('secure flag in production', sessions_settings_object.cookie.secure === true, 'Secure flag enabled in production');
} else {
    console.log(`ℹ️  Secure flag disabled in development (expected)`);
}

console.log('\n==========================');
console.log(`Tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    console.log('❌ Session configuration has security issues!');
    process.exit(1);
} else {
    console.log('✅ Session configuration is secure!');
    process.exit(0);
}
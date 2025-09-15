/**
 * Session management middleware
 */

const sessions = require('@nvanexan/node-client-sessions');
const database = require('../../shared/database.js');
const constants = require('../../shared/constants.js');
const config = require('../../shared/config.js');
const Settings = database.Settings;

let sessions_middleware = false;

const sessions_settings_object = {
    cookieName: config.session.cookieName,
    duration: config.session.duration,
    activeDuration: config.session.activeDuration,
    cookie: {
        httpOnly: true,
        secure: !config.isDevelopment && config.security.cookieSecure
    }
};

function session_wrapper_function(req, res, next) {
    return sessions_middleware(req, res, next);
}

/**
 * Initialize session middleware with secret from database
 */
async function initializeSessionMiddleware() {
    // Check for existing session secret value
    const session_secret_setting = await Settings.findOne({
        where: {
            key: constants.session_secret_key
        }
    });

    if (!session_secret_setting) {
        console.error(`No session secret is set, can't start API server (this really shouldn't happen...)!`);
        throw new Error('NO_SESSION_SECRET_SET');
    }

    const updated_session_settings = {
        ...sessions_settings_object,
        ...{
            secret: session_secret_setting.value
        }
    };
    
    sessions_middleware = sessions(updated_session_settings);
    return session_wrapper_function;
}

/**
 * Reinitialize session middleware with new secret
 * This is called when the session secret is rotated
 */
async function reinitializeSessionMiddleware() {
    // Check for existing session secret value
    const session_secret_setting = await Settings.findOne({
        where: {
            key: constants.session_secret_key
        }
    });

    if (!session_secret_setting) {
        console.error(`No session secret is set during reinitialize!`);
        throw new Error('NO_SESSION_SECRET_SET');
    }

    const updated_session_settings = {
        ...sessions_settings_object,
        ...{
            secret: session_secret_setting.value
        }
    };
    
    sessions_middleware = sessions(updated_session_settings);
}

module.exports = {
    initializeSessionMiddleware,
    reinitializeSessionMiddleware,
    session_wrapper_function,
};
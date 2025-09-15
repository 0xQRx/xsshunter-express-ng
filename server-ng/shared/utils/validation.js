/**
 * Validation utilities for probe data and callbacks
 */

/**
 * Validate and sanitize JSON data from probe
 * @param {string} data - Raw data string
 * @param {string} fieldName - Name of field for logging
 * @param {*} defaultValue - Default value if validation fails
 * @returns {string} - Valid JSON string or default value
 */
function validateJSON(data, fieldName, defaultValue = '[]') {
    if (!data || data === '') {
        return defaultValue;
    }

    try {
        // Try to parse the JSON to validate it
        const parsed = JSON.parse(data);
        // Re-stringify to ensure consistent formatting
        return JSON.stringify(parsed);
    } catch (error) {
        console.error(`[Validation] Invalid JSON in ${fieldName}:`, error.message);
        console.error(`[Validation] Raw data preview: ${data.substring(0, 200)}...`);
        return defaultValue;
    }
}

/**
 * Validate boolean values
 * @param {*} value - Value to validate
 * @returns {boolean} - Boolean value
 */
function validateBoolean(value) {
    return value === 'true' || value === true;
}

/**
 * Validate integer values
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default value if validation fails
 * @returns {number} - Valid integer or default
 */
function validateInteger(value, defaultValue = 0) {
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Ensure string type (no content validation)
 * @param {*} value - Value to ensure is string
 * @returns {string} - String value
 */
function ensureString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}

/**
 * Validate and sanitize probe payload data
 * Validates format of known fields without enforcing size limits
 * @param {object} body - Request body from probe
 * @returns {object} - {valid: boolean, data?: object, errors?: array}
 */
function validateProbeData(body) {
    const errors = [];

    // Validate JSON fields - reject if malformed
    const localStorage = body.localStorage;
    if (localStorage && localStorage !== '') {
        try {
            JSON.parse(localStorage);
        } catch (e) {
            errors.push(`Invalid JSON in localStorage: ${e.message}`);
        }
    }

    const sessionStorage = body.sessionStorage;
    if (sessionStorage && sessionStorage !== '') {
        try {
            JSON.parse(sessionStorage);
        } catch (e) {
            errors.push(`Invalid JSON in sessionStorage: ${e.message}`);
        }
    }

    const customData = body.custom_data;
    if (customData && customData !== '') {
        try {
            JSON.parse(customData);
        } catch (e) {
            errors.push(`Invalid JSON in custom_data: ${e.message}`);
        }
    }

    // If there are validation errors, return invalid
    if (errors.length > 0) {
        return {
            valid: false,
            errors: errors
        };
    }

    // Return validated data
    return {
        valid: true,
        data: {
            probe_secret: ensureString(body.probe_secret),
            url: ensureString(body.uri),
            referer: ensureString(body.referrer),
            user_agent: ensureString(body['user-agent']),
            cookies: ensureString(body.cookies),
            title: ensureString(body.title),
            dom: ensureString(body.dom),
            text: ensureString(body.text),
            origin: ensureString(body.origin),
            was_iframe: validateBoolean(body.was_iframe),
            injection_key: ensureString(body.injection_key) || 'default',
            browser_timestamp: validateInteger(body['browser-time'], 0),
            probe_uid: ensureString(body['probe-uid']),
            local_storage: localStorage || '[]',
            session_storage: sessionStorage || '[]',
            custom_data: customData || '[]'
        }
    };
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} - True if valid UUID
 */
function validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate session token format (64 char hex string)
 * @param {string} token - Token to validate
 * @returns {boolean} - True if valid token
 */
function validateSessionToken(token) {
    const tokenRegex = /^[0-9a-f]{64}$/i;
    return tokenRegex.test(token);
}

/**
 * Validate and sanitize background callback data
 * @param {object} body - Request body from background callback
 * @returns {object} - Validated data or error
 */
function validateBackgroundData(body) {
    // Check required fields (note: custom_data can't be null/undefined)
    if (!body.payload_id || !body.session_token || body.custom_data === undefined || body.custom_data === null) {
        return {
            valid: false,
            error: "Missing required fields"
        };
    }

    // Validate UUID format
    if (!validateUUID(body.payload_id)) {
        return {
            valid: false,
            error: "Invalid payload ID format"
        };
    }

    // Validate session token format
    if (!validateSessionToken(body.session_token)) {
        return {
            valid: false,
            error: "Invalid session token format"
        };
    }

    // Validate custom_data is valid JSON object
    let custom_data;
    if (typeof body.custom_data === 'string') {
        try {
            custom_data = JSON.parse(body.custom_data);
            // Must be an object, not null or array
            if (typeof custom_data !== 'object' || custom_data === null || Array.isArray(custom_data)) {
                return {
                    valid: false,
                    error: "Custom data must be a JSON object"
                };
            }
        } catch (e) {
            return {
                valid: false,
                error: "Invalid JSON in custom_data"
            };
        }
    } else if (typeof body.custom_data === 'object' && body.custom_data !== null && !Array.isArray(body.custom_data)) {
        custom_data = body.custom_data;
    } else {
        return {
            valid: false,
            error: "Invalid custom data format"
        };
    }

    return {
        valid: true,
        data: {
            payload_id: body.payload_id,
            session_token: body.session_token,
            custom_data: custom_data
        }
    };
}

/**
 * Validate and sanitize page callback data
 * @param {object} body - Request body from page callback
 * @returns {object} - Validated data or error
 */
function validatePageData(body) {
    // Check required authentication fields
    if (!body.payload_id || !body.session_token) {
        return {
            valid: false,
            error: "Missing authentication"
        };
    }

    // Validate UUID format
    if (!validateUUID(body.payload_id)) {
        return {
            valid: false,
            error: "Invalid payload ID format"
        };
    }

    // Validate session token format
    if (!validateSessionToken(body.session_token)) {
        return {
            valid: false,
            error: "Invalid session token format"
        };
    }

    return {
        valid: true,
        data: {
            payload_id: body.payload_id,
            session_token: body.session_token,
            uri: ensureString(body.uri),
            html: ensureString(body.html)
        }
    };
}

module.exports = {
    validateJSON,
    validateBoolean,
    validateInteger,
    ensureString,
    validateProbeData,
    validateUUID,
    validateSessionToken,
    validateBackgroundData,
    validatePageData
};
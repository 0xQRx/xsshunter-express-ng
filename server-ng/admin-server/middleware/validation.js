/**
 * Validation schemas for all API endpoints
 * Using express-jsonschema format
 */

const LoginSchema = {
    type: 'object',
    properties: {
        password: {
            type: 'string',
            minLength: 1,
            maxLength: 72,
            required: true,
        },
    }
};

const DeletePayloadFiresSchema = {
    type: 'object',
    properties: {
        ids: {
            type: 'array',
            required: true,
            items: {
                type: 'string'
            }
        }
    }
};

const ListPayloadFiresSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            required: false,
            default: '0',
            pattern: '[0-9]+',
        },
        limit: {
            type: 'string',
            required: false,
            default: '10',
            pattern: '[0-9]+',
        },
    }
};

const ListCollectedPagesSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            required: false,
            default: '0',
            pattern: '[0-9]+',
        },
        limit: {
            type: 'string',
            required: false,
            default: '10',
            pattern: '[0-9]+',
        },
    }
};

const DeleteCollectedPagesSchema = {
    type: 'object',
    properties: {
        ids: {
            type: 'array',
            required: true,
            items: {
                type: 'string'
            }
        }
    }
};

const RecordCorrelatedRequestSchema = {
    type: 'object',
    properties: {
        request: {
            type: 'string',
            required: true,
        },
        owner_correlation_key: {
            type: 'string',
            required: true,
        },
        injection_key: {
            type: 'string',
            required: true,
        },
    }
};

const UpdateConfigSchema = {
    type: 'object',
    properties: {
        password: {
            type: 'string',
            required: false,
        },
        correlation_api_key: {
            type: 'boolean',
            required: false,
        },
        chainload_uri: {
            type: 'string',
            required: false,
        },
        send_alert_emails: {
            type: 'boolean',
            required: false,
        },
        send_discord_alerts: {
            type: 'boolean',
            required: false,
        },
        revoke_all_sessions: {
            type: 'boolean',
            required: false,
        },
        pages_to_collect: {
            type: 'array',
            required: false,
            items: {
                type: 'string'
            }
        }
    }
};

const CreateExtensionSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 255,
        },
        type: {
            type: 'string',
            required: false,
            enum: ['javascript', 'html', 'markdown'],
            default: 'javascript',
        },
        code: {
            type: 'string',
            required: true,
            minLength: 1,
        },
        // For custom payloads
        description: {
            type: 'string',
            required: false,
            maxLength: 1000,
        },
        author: {
            type: 'string',
            required: false,
            maxLength: 100,
        },
        risk_level: {
            type: 'string',
            required: false,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        category: {
            type: 'string',
            required: false,
            maxLength: 50,
        },
        is_active: {
            type: 'boolean',
            required: false,
            default: true,
        },
    }
};

const UpdateExtensionSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            required: false,
            minLength: 1,
            maxLength: 255,
        },
        type: {
            type: 'string',
            required: false,
            enum: ['javascript', 'html', 'markdown'],
        },
        code: {
            type: 'string',
            required: false,
            minLength: 1,
        },
        // For custom payloads
        description: {
            type: 'string',
            required: false,
            maxLength: 1000,
        },
        author: {
            type: 'string',
            required: false,
            maxLength: 100,
        },
        risk_level: {
            type: 'string',
            required: false,
            enum: ['low', 'medium', 'high'],
        },
        category: {
            type: 'string',
            required: false,
            maxLength: 50,
        },
        is_active: {
            type: 'boolean',
            required: false,
        },
    }
};

module.exports = {
    LoginSchema,
    DeletePayloadFiresSchema,
    ListPayloadFiresSchema,
    ListCollectedPagesSchema,
    DeleteCollectedPagesSchema,
    RecordCorrelatedRequestSchema,
    UpdateConfigSchema,
    CreateExtensionSchema,
    UpdateExtensionSchema,
};
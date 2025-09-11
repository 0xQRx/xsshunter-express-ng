/**
 * Centralized configuration management
 * All environment variables and config in one place
 */

const config = {
    // Environment
    isDevelopment: process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development',
    environment: process.env.NODE_ENV || 'development',
    
    // Server configuration
    hostname: process.env.HOSTNAME,
    dualPortMode: process.env.DUAL_PORT_MODE !== 'false',
    
    // Port configuration
    ports: {
        payload: parseInt(process.env.PAYLOAD_PORT || 3000),
        admin: parseInt(process.env.ADMIN_PORT || 8443),
        http: 80,
        https: 443
    },
    
    // SSL/TLS configuration
    ssl: {
        contactEmail: process.env.SSL_CONTACT_EMAIL,
        certPath: process.env.SSL_CERT_PATH,
        keyPath: process.env.SSL_KEY_PATH
    },
    
    // Email configuration
    smtp: {
        enabled: process.env.SMTP_EMAIL_NOTIFICATIONS_ENABLED === 'true',
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || 465),
        useTLS: process.env.SMTP_USE_TLS !== 'false',
        username: process.env.SMTP_USERNAME,
        password: process.env.SMTP_PASSWORD,
        fromEmail: process.env.SMTP_FROM_EMAIL,
        receiverEmail: process.env.SMTP_RECEIVER_EMAIL
    },
    
    // Discord configuration
    discord: {
        enabled: !!process.env.DISCORD_WEBHOOK_URL,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
    },
    
    // Control panel configuration
    controlPanel: {
        enabled: process.env.CONTROL_PANEL_ENABLED === 'true'
    },
    
    // File storage configuration
    storage: {
        screenshotsDir: process.env.SCREENSHOTS_DIR || '/tmp/xsshunter-screenshots',
        payloadFireImagesDir: process.env.PAYLOAD_FIRE_IMAGES_DIR || './payload-fire-images'
    },
    
    // Request limits configuration
    limits: {
        // Maximum XSS callback payload size (includes screenshot, DOM, text, metadata)
        // If payload exceeds this limit, you won't be notified of the XSS firing
        maxPayloadSizeMB: parseInt(process.env.MAX_PAYLOAD_UPLOAD_SIZE_MB || 150)
    },
    
    // Database configuration
    database: {
        // These are typically set in database.js directly
        // but we can centralize them here if needed
        logging: process.env.DB_LOGGING === 'true'
    },
    
    // Security configuration
    security: {
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
        cookieSecure: process.env.COOKIE_SECURE !== 'false'
    },
    
    // API configuration
    api: {
        basePath: '/api/v1/',
        csrfHeaderName: 'X-CSRF'
    },
    
    // Session configuration
    session: {
        cookieName: 'session',
        duration: 7 * 24 * 60 * 60 * 1000, // 1 week
        activeDuration: 5 * 60 * 1000 // 5 minutes
    }
};

// Helper function to check required configuration
config.validate = function() {
    const errors = [];
    
    // Check required settings for production
    if (!this.isDevelopment) {
        if (!this.hostname) {
            errors.push('HOSTNAME is required in production mode');
        }
        if (!this.ssl.contactEmail) {
            errors.push('SSL_CONTACT_EMAIL is required in production mode');
        }
    }
    
    // Check email configuration if enabled
    if (this.smtp.enabled) {
        if (!this.smtp.host) errors.push('SMTP_HOST is required when email notifications are enabled');
        if (!this.smtp.username) errors.push('SMTP_USERNAME is required when email notifications are enabled');
        if (!this.smtp.password) errors.push('SMTP_PASSWORD is required when email notifications are enabled');
        if (!this.smtp.fromEmail) errors.push('SMTP_FROM_EMAIL is required when email notifications are enabled');
        if (!this.smtp.receiverEmail) errors.push('SMTP_RECEIVER_EMAIL is required when email notifications are enabled');
    }
    
    return errors;
};

// Helper function to get a safe version for logging (no passwords)
config.getSafeConfig = function() {
    const safe = JSON.parse(JSON.stringify(this));
    
    // Remove sensitive data
    if (safe.smtp.password) safe.smtp.password = '***';
    if (safe.discord.webhookUrl) safe.discord.webhookUrl = '***';
    
    return safe;
};

module.exports = config;
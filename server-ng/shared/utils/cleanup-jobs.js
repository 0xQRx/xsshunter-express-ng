/**
 * Background cleanup jobs for XSS Hunter Express
 * Maintains database hygiene by removing old/expired records
 */

const database = require('../database.js');
const ProbeTokens = database.ProbeTokens;
const Sequelize = database.sequelize.Sequelize;

// Configuration
const CLEANUP_CONFIG = {
    // How often to run cleanup (in milliseconds)
    INTERVAL: 30 * 60 * 1000,  // 30 minutes
    
    // How long to keep unused probe tokens
    UNUSED_TOKEN_TTL: 24 * 60 * 60 * 1000,  // 24 hours
    
    // How long before a session is considered inactive
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,  // 30 minutes
    
    // How long to keep used probe tokens (for audit trail)
    USED_TOKEN_TTL: 7 * 24 * 60 * 60 * 1000,  // 7 days
    
    // Enable console logging
    VERBOSE: true
};

/**
 * Clean up old probe tokens
 * Removes:
 * - Unused tokens older than 24 hours (likely abandoned)
 * - Used tokens with no activity for 30 minutes (inactive sessions)
 * - Used tokens older than 7 days (no longer needed for background submissions)
 */
async function cleanupProbeTokens() {
    const startTime = Date.now();
    
    try {
        // Calculate cutoff times
        const unusedCutoff = new Date(Date.now() - CLEANUP_CONFIG.UNUSED_TOKEN_TTL);
        const inactivityCutoff = new Date(Date.now() - CLEANUP_CONFIG.INACTIVITY_TIMEOUT);
        const usedCutoff = new Date(Date.now() - CLEANUP_CONFIG.USED_TOKEN_TTL);
        
        // Delete unused tokens older than 24 hours
        const unusedDeleted = await ProbeTokens.destroy({
            where: {
                used: false,
                createdAt: {
                    [Sequelize.Op.lt]: unusedCutoff
                }
            }
        });

        // Delete inactive sessions (used tokens with no activity for 30 minutes)
        const inactiveDeleted = await ProbeTokens.destroy({
            where: {
                used: true,
                last_activity: {
                    [Sequelize.Op.not]: null,
                    [Sequelize.Op.lt]: inactivityCutoff
                }
            }
        });

        // Delete used tokens older than 7 days (regardless of activity)
        const oldDeleted = await ProbeTokens.destroy({
            where: {
                used: true,
                createdAt: {
                    [Sequelize.Op.lt]: usedCutoff
                }
            }
        });

        const duration = Date.now() - startTime;
        const totalDeleted = unusedDeleted + inactiveDeleted + oldDeleted;
        
        if (CLEANUP_CONFIG.VERBOSE && totalDeleted > 0) {
            console.log(`[Cleanup] ProbeTokens: Deleted ${unusedDeleted} unused, ${inactiveDeleted} inactive, and ${oldDeleted} old tokens in ${duration}ms`);
        }
        
        return { unusedDeleted, inactiveDeleted, oldDeleted, duration };
        
    } catch (error) {
        console.error('[Cleanup] Error cleaning probe tokens:', error);
        return { error: error.message };
    }
}

/**
 * Future cleanup jobs can be added here
 * Examples:
 * - cleanupOldPayloadFires() - Remove very old XSS reports
 * - cleanupOrphanedScreenshots() - Remove screenshots without associated reports
 * - cleanupFailedInjections() - Remove old injection request records
 */

/**
 * Main cleanup runner
 * Executes all cleanup jobs
 */
async function runAllCleanupJobs() {
    if (CLEANUP_CONFIG.VERBOSE) {
        console.log('[Cleanup] Starting scheduled cleanup jobs...');
    }
    
    // Run all cleanup jobs
    const results = {
        probeTokens: await cleanupProbeTokens(),
        // Add more cleanup jobs here as needed
    };
    
    if (CLEANUP_CONFIG.VERBOSE) {
        console.log('[Cleanup] All cleanup jobs completed');
    }
    
    return results;
}

/**
 * Initialize cleanup jobs
 * Sets up interval-based execution
 */
function initializeCleanupJobs() {
    console.log(`[Cleanup] Initializing cleanup jobs (interval: ${CLEANUP_CONFIG.INTERVAL / 1000}s)`);
    
    // Delay initial cleanup to ensure database is ready
    setTimeout(() => {
        runAllCleanupJobs().then(results => {
            console.log('[Cleanup] Initial cleanup completed:', results);
        }).catch(error => {
            console.error('[Cleanup] Initial cleanup failed:', error.message);
        });
    }, 5000); // Wait 5 seconds for database initialization
    
    // Schedule periodic cleanup
    const intervalId = setInterval(runAllCleanupJobs, CLEANUP_CONFIG.INTERVAL);
    
    // Don't register signal handlers here - let the main server handle shutdown
    // Just return the intervalId so it can be cleaned up externally if needed
    
    return intervalId;
}

/**
 * Manual cleanup trigger
 * Can be called directly if needed
 */
async function manualCleanup() {
    console.log('[Cleanup] Manual cleanup triggered');
    return await runAllCleanupJobs();
}

module.exports = {
    initializeCleanupJobs,
    manualCleanup,
    cleanupProbeTokens,
    CLEANUP_CONFIG
};
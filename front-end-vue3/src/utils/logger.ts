/**
 * Conditional logging utility for development/production
 * Prevents sensitive data from being logged in production
 */

const isDevelopment = import.meta.env.DEV

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors but sanitize in production
    if (isDevelopment) {
      console.error(...args)
    } else {
      // In production, log errors without sensitive details
      console.error('An error occurred. Check server logs for details.')
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  }
}

export default logger
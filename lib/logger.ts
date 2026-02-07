/**
 * Secure Logging System
 * Centralizes logging with proper levels and sanitization
 * Production-ready with sensitive data protection
 */

import { sanitizeForLog } from './sanitization';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security',
}

// Log context
interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

// Logger configuration
const config = {
  enabled: true,
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeTimestamp: true,
  includeContext: true,
  sanitize: true,
};

// Level priority for filtering
const levelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.SECURITY]: 4,
};

// Should log based on level
function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return levelPriority[level] >= levelPriority[config.level];
}

// Format log message
function formatLog(
  level: LogLevel,
  message: string,
  data?: any,
  context?: LogContext
): string {
  const timestamp = config.includeTimestamp ? new Date().toISOString() : '';
  const sanitizedData = config.sanitize && data ? sanitizeForLog(data) : data;
  const sanitizedContext = config.sanitize && context ? sanitizeForLog(context) : context;

  const logObject = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(sanitizedData && { data: sanitizedData }),
    ...(config.includeContext && sanitizedContext && { context: sanitizedContext }),
  };

  return JSON.stringify(logObject);
}

// Main logger class
class Logger {
  private context: LogContext = {};

  // Set context for all subsequent logs
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  // Clear context
  clearContext(): void {
    this.context = {};
  }

  // Debug logs (development only)
  debug(message: string, data?: any, additionalContext?: LogContext): void {
    if (!shouldLog(LogLevel.DEBUG)) return;

    const log = formatLog(LogLevel.DEBUG, message, data, {
      ...this.context,
      ...additionalContext,
    });

    if (process.env.NODE_ENV === 'production') {
      // In production, send to logging service (e.g., Datadog, Logtail)
      this.sendToLoggingService(log);
    } else {
      console.log(`🔍 ${log}`);
    }
  }

  // Info logs
  info(message: string, data?: any, additionalContext?: LogContext): void {
    if (!shouldLog(LogLevel.INFO)) return;

    const log = formatLog(LogLevel.INFO, message, data, {
      ...this.context,
      ...additionalContext,
    });

    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(log);
    } else {
      console.log(`ℹ️  ${log}`);
    }
  }

  // Warning logs
  warn(message: string, data?: any, additionalContext?: LogContext): void {
    if (!shouldLog(LogLevel.WARN)) return;

    const log = formatLog(LogLevel.WARN, message, data, {
      ...this.context,
      ...additionalContext,
    });

    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(log);
    } else {
      console.warn(`⚠️  ${log}`);
    }
  }

  // Error logs
  error(message: string, error?: Error | any, additionalContext?: LogContext): void {
    if (!shouldLog(LogLevel.ERROR)) return;

    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

    const log = formatLog(LogLevel.ERROR, message, errorData, {
      ...this.context,
      ...additionalContext,
    });

    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(log);
      // Also send to error tracking service (e.g., Sentry)
      this.sendToErrorTracking(message, error, additionalContext);
    } else {
      console.error(`❌ ${log}`);
    }
  }

  // Security logs (always logged)
  security(message: string, data?: any, additionalContext?: LogContext): void {
    const log = formatLog(LogLevel.SECURITY, message, data, {
      ...this.context,
      ...additionalContext,
    });

    // Security logs always go to production logging
    this.sendToLoggingService(log);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔒 ${log}`);
    }
  }

  // Send to external logging service
  private sendToLoggingService(log: string): void {
    // TODO: Implement integration with logging service
    // Examples: Datadog, Logtail, CloudWatch, etc.
    
    if (process.env.LOGGING_ENDPOINT) {
      try {
        // Non-blocking logging
        fetch(process.env.LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`,
          },
          body: log,
        }).catch(() => {
          // Silently fail - don't break app if logging fails
        });
      } catch {
        // Silently fail
      }
    }
  }

  // Send to error tracking service
  private sendToErrorTracking(message: string, error: any, context?: LogContext): void {
    // TODO: Implement integration with Sentry or similar
    
    if (process.env.SENTRY_DSN) {
      try {
        // Example: Sentry integration
        // Sentry.captureException(error, { extra: context });
      } catch {
        // Silently fail
      }
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Request logger helper
export function createRequestLogger(requestId: string, path: string, method: string, ip?: string) {
  const requestLogger = new Logger();
  requestLogger.setContext({
    requestId,
    path,
    method,
    ip,
  });
  return requestLogger;
}

// API Route logger helper
export function logApiRequest(
  method: string,
  path: string,
  userId?: string,
  duration?: number
): void {
  logger.info('API Request', {
    method,
    path,
    userId,
    duration: duration ? `${duration}ms` : undefined,
  });
}

// API Route error logger
export function logApiError(
  method: string,
  path: string,
  error: Error | any,
  userId?: string
): void {
  logger.error('API Error', error, {
    method,
    path,
    userId,
  });
}

// Authentication event logger
export function logAuthEvent(
  event: 'login' | 'logout' | 'register' | 'failed_login' | 'session_expired',
  userId?: string,
  ip?: string,
  details?: any
): void {
  logger.security(`Auth Event: ${event}`, details, {
    userId,
    ip,
    event,
  });
}

// Database query logger (for slow queries)
export function logSlowQuery(
  query: string,
  duration: number,
  userId?: string
): void {
  logger.warn('Slow Query Detected', {
    query: query.substring(0, 200), // Truncate long queries
    duration: `${duration}ms`,
    userId,
  });
}

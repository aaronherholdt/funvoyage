// lib/logger.ts
// Lightweight centralized logger with context support and log levels

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    sessionId?: string;
    userId?: string;
    component?: string;
    [key: string]: unknown;
}

interface LoggerConfig {
    minLevel: LogLevel;
    enableTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Environment-aware default config
const getDefaultConfig = (): LoggerConfig => ({
    minLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    enableTimestamp: true,
});

let globalContext: LogContext = {};
let config: LoggerConfig = getDefaultConfig();

/**
 * Set global context that will be included in all log messages
 */
export const setLogContext = (context: Partial<LogContext>) => {
    globalContext = { ...globalContext, ...context };
};

/**
 * Clear specific keys from global context
 */
export const clearLogContext = (...keys: (keyof LogContext)[]) => {
    keys.forEach(key => delete globalContext[key]);
};

/**
 * Configure logger settings
 */
export const configureLogger = (newConfig: Partial<LoggerConfig>) => {
    config = { ...config, ...newConfig };
};

const formatMessage = (
    level: LogLevel,
    message: string,
    context?: LogContext
): string => {
    const parts: string[] = [];

    if (config.enableTimestamp) {
        parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(`[${level.toUpperCase()}]`);

    const mergedContext = { ...globalContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
        const contextStr = Object.entries(mergedContext)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join(' ');
        if (contextStr) {
            parts.push(`[${contextStr}]`);
        }
    }

    parts.push(message);

    return parts.join(' ');
};

const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

/**
 * Log a debug message (development only by default)
 */
export const debug = (message: string, context?: LogContext, ...args: unknown[]) => {
    if (shouldLog('debug')) {
        console.debug(formatMessage('debug', message, context), ...args);
    }
};

/**
 * Log an info message
 */
export const info = (message: string, context?: LogContext, ...args: unknown[]) => {
    if (shouldLog('info')) {
        console.info(formatMessage('info', message, context), ...args);
    }
};

/**
 * Log a warning message
 */
export const warn = (message: string, context?: LogContext, ...args: unknown[]) => {
    if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message, context), ...args);
    }
};

/**
 * Log an error message
 */
export const error = (message: string, context?: LogContext, ...args: unknown[]) => {
    if (shouldLog('error')) {
        console.error(formatMessage('error', message, context), ...args);
    }
};

/**
 * Create a child logger with preset context
 */
export const createLogger = (defaultContext: LogContext) => ({
    debug: (msg: string, ctx?: LogContext, ...args: unknown[]) =>
        debug(msg, { ...defaultContext, ...ctx }, ...args),
    info: (msg: string, ctx?: LogContext, ...args: unknown[]) =>
        info(msg, { ...defaultContext, ...ctx }, ...args),
    warn: (msg: string, ctx?: LogContext, ...args: unknown[]) =>
        warn(msg, { ...defaultContext, ...ctx }, ...args),
    error: (msg: string, ctx?: LogContext, ...args: unknown[]) =>
        error(msg, { ...defaultContext, ...ctx }, ...args),
});

// Default export for convenience
const logger = {
    debug,
    info,
    warn,
    error,
    setContext: setLogContext,
    clearContext: clearLogContext,
    configure: configureLogger,
    createLogger,
};

export default logger;



type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    error?: Error | unknown;
}

class Logger {
    private isServer: boolean;

    constructor() {
        this.isServer = typeof window === 'undefined';
    }

    private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : error
        };
    }

    private output(entry: LogEntry) {
        const colorMap = {
            debug: '\x1b[34m', // Blue
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
        };
        const reset = '\x1b[0m';

        // In server environment, we can use colors. In browser, we might want to use console styles (CSS).
        // For now, simple console methods.

        const contextStr = entry.context ? JSON.stringify(entry.context) : '';
        const errStr = entry.error ? JSON.stringify(entry.error) : '';

        // Structured JSON for easier parsing by tools if needed, but readable for humans
        if (this.isServer) {
            // Server side: standardized format
            const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
            const fullMessage = `${prefix} ${entry.message} ${contextStr} ${errStr}`;

            switch (entry.level) {
                case 'debug': console.debug(colorMap.debug + fullMessage + reset); break;
                case 'info': console.info(colorMap.info + fullMessage + reset); break;
                case 'warn': console.warn(colorMap.warn + fullMessage + reset); break;
                case 'error': console.error(colorMap.error + fullMessage + reset); break;
            }
        } else {
            // Client side: simple pass through
            const prefix = `[${entry.level.toUpperCase()}]`;
            switch (entry.level) {
                case 'debug': console.debug(prefix, entry.message, entry.context || ''); break;
                case 'info': console.info(prefix, entry.message, entry.context || ''); break;
                case 'warn': console.warn(prefix, entry.message, entry.context || ''); break;
                case 'error': console.error(prefix, entry.message, entry.context || '', entry.error || ''); break;
            }
        }
    }

    debug(message: string, context?: Record<string, unknown>) {
        this.output(this.formatEntry('debug', message, context));
    }

    info(message: string, context?: Record<string, unknown>) {
        this.output(this.formatEntry('info', message, context));
    }

    warn(message: string, context?: Record<string, unknown>) {
        this.output(this.formatEntry('warn', message, context));
    }

    error(message: string, error?: unknown, context?: Record<string, unknown>) {
        this.output(this.formatEntry('error', message, context, error));
    }
}

export const logger = new Logger();

/**
 * Logger - Unified logging system for GStock
 * Phase 20A: Error Logging Enhancement
 * 
 * - Logs to console (development)
 * - Logs to SQLite database (server-side)
 * - Can be extended to external services (Sentry, etc.)
 */

import { ErrorStore } from './db';

type LogLevel = 'ERROR' | 'WARN' | 'INFO';

interface LogOptions {
    context?: string;
    error?: Error;
}

class LoggerClass {
    private isServer = typeof window === 'undefined';
    
    /**
     * Log an error
     */
    error(message: string, options?: LogOptions): void {
        this.log('ERROR', message, options);
    }
    
    /**
     * Log a warning
     */
    warn(message: string, options?: LogOptions): void {
        this.log('WARN', message, options);
    }
    
    /**
     * Log info
     */
    info(message: string, options?: LogOptions): void {
        this.log('INFO', message, options);
    }
    
    private log(level: LogLevel, message: string, options?: LogOptions): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}]`;
        const context = options?.context ? ` [${options.context}]` : '';
        const fullMessage = `${prefix}${context} ${message}`;
        
        // Always log to console
        switch (level) {
            case 'ERROR':
                console.error(fullMessage, options?.error || '');
                break;
            case 'WARN':
                console.warn(fullMessage);
                break;
            case 'INFO':
                console.log(fullMessage);
                break;
        }
        
        // Log to database (server-side only)
        if (this.isServer) {
            try {
                ErrorStore.log({
                    level,
                    message,
                    context: options?.context,
                    stack: options?.error?.stack,
                });
            } catch {
                // Fallback: don't crash if DB logging fails
                console.error('[Logger] Failed to write to database');
            }
        }
    }
}

export const Logger = new LoggerClass();

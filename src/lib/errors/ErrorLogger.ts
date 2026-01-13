/**
 * ErrorLogger - Centralized Error Logging System
 * Phase 20A: Error Logging Enhancement
 */

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'gstock-error-logs';
const MAX_LOGS = 100;

export class ErrorLogger {
  private static logs: ErrorLog[] = [];
  private static initialized = false;

  /**
   * Initialize logger (load from localStorage)
   */
  static init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch {
      this.logs = [];
    }
    this.initialized = true;
  }

  /**
   * Log an error
   */
  static error(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, context, metadata);
  }

  /**
   * Log a warning
   */
  static warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, context, metadata);
  }

  /**
   * Log info
   */
  static info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, context, metadata);
  }

  /**
   * Core logging function
   */
  private static log(
    level: ErrorLog['level'],
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.init();

    const entry: ErrorLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
    };

    // Capture stack trace for errors
    if (level === 'error') {
      try {
        throw new Error();
      } catch (e) {
        entry.stack = (e as Error).stack?.split('\n').slice(3).join('\n');
      }
    }

    // Add to in-memory logs
    this.logs.unshift(entry);
    
    // Trim to max size
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    // Persist to localStorage
    this.persist();

    // Also log to console with styling
    const styles = {
      error: 'color: #ef4444; font-weight: bold',
      warn: 'color: #f59e0b; font-weight: bold',
      info: 'color: #3b82f6',
    };

    console.log(
      `%c[GStock ${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`,
      styles[level],
      metadata || ''
    );
  }

  /**
   * Save logs to localStorage
   */
  private static persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      // Storage full - clear old logs
      this.logs = this.logs.slice(0, 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    }
  }

  /**
   * Get all logs
   */
  static getLogs(): ErrorLog[] {
    this.init();
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  static getLogsByLevel(level: ErrorLog['level']): ErrorLog[] {
    this.init();
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all logs
   */
  static clear(): void {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Export logs as JSON
   */
  static exportJSON(): string {
    this.init();
    return JSON.stringify(this.logs, null, 2);
  }
}

export default ErrorLogger;

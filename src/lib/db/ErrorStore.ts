/**
 * ErrorStore - Server-side error logging using SQLite
 * Phase 20A: Centralized error collection
 */

import { getDatabase } from './database';

export interface ErrorLogEntry {
    id?: number;
    timestamp: string;
    level: 'ERROR' | 'WARN' | 'INFO';
    message: string;
    context?: string;
    stack?: string;
}

export class ErrorStore {
    /**
     * Log an error
     */
    static log(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>): ErrorLogEntry {
        const db = getDatabase();
        const timestamp = new Date().toISOString();
        
        const stmt = db.prepare(`
            INSERT INTO error_logs (timestamp, level, message, context, stack)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            timestamp,
            entry.level,
            entry.message,
            entry.context || null,
            entry.stack || null
        );
        
        return {
            id: result.lastInsertRowid as number,
            timestamp,
            ...entry,
        };
    }
    
    /**
     * Get recent error logs
     */
    static getRecent(limit: number = 100): ErrorLogEntry[] {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT id, timestamp, level, message, context, stack
            FROM error_logs
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        
        return stmt.all(limit) as ErrorLogEntry[];
    }
    
    /**
     * Get errors by level
     */
    static getByLevel(level: 'ERROR' | 'WARN' | 'INFO', limit: number = 100): ErrorLogEntry[] {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT id, timestamp, level, message, context, stack
            FROM error_logs
            WHERE level = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        
        return stmt.all(level, limit) as ErrorLogEntry[];
    }
    
    /**
     * Get error count by level for the last N hours
     */
    static getCountByLevel(hours: number = 24): Record<string, number> {
        const db = getDatabase();
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        
        const stmt = db.prepare(`
            SELECT level, COUNT(*) as count
            FROM error_logs
            WHERE timestamp > ?
            GROUP BY level
        `);
        
        const rows = stmt.all(cutoff) as Array<{ level: string; count: number }>;
        const result: Record<string, number> = { ERROR: 0, WARN: 0, INFO: 0 };
        
        for (const row of rows) {
            result[row.level] = row.count;
        }
        
        return result;
    }
    
    /**
     * Clear old logs (keep last N days)
     */
    static cleanup(keepDays: number = 30): number {
        const db = getDatabase();
        const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
        
        const stmt = db.prepare(`
            DELETE FROM error_logs
            WHERE timestamp < ?
        `);
        
        const result = stmt.run(cutoff);
        return result.changes;
    }
}

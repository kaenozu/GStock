/**
 * Database Module - SQLite database for GStock
 * Provides persistent storage for predictions and errors
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'gstock.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        initializeTables();
    }
    return db;
}

function initializeTables(): void {
    const db = getDatabase();
    
    // Predictions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            symbol TEXT NOT NULL,
            predicted_direction TEXT NOT NULL,
            confidence REAL NOT NULL,
            price_at_prediction REAL NOT NULL,
            target_date TEXT NOT NULL,
            regime TEXT,
            actual_direction TEXT,
            price_at_evaluation REAL,
            is_correct INTEGER,
            evaluated_at TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON predictions(symbol);
        CREATE INDEX IF NOT EXISTS idx_predictions_target_date ON predictions(target_date);
        CREATE INDEX IF NOT EXISTS idx_predictions_evaluated ON predictions(evaluated_at);
    `);
    
    // Error logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS error_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            context TEXT,
            stack TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON error_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_errors_level ON error_logs(level);
    `);
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
    }
}

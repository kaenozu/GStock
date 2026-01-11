/**
 * PredictionStore - Server-side prediction storage using SQLite
 * Phase 20A: Replaces localStorage-based PredictionLogger
 */

import { getDatabase } from './database';
import { PredictionRecord } from '@/types/accuracy';
import { MarketRegime } from '@/types/market';

export class PredictionStore {
    /**
     * Log a new prediction
     */
    static log(params: {
        symbol: string;
        predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        confidence: number;
        priceAtPrediction: number;
        regime?: MarketRegime;
    }): PredictionRecord {
        const db = getDatabase();
        const now = new Date();
        const targetDate = this.getNextTradingDay(now);
        
        const record: PredictionRecord = {
            id: `${params.symbol}-${now.getTime()}`,
            timestamp: now.toISOString(),
            symbol: params.symbol,
            predictedDirection: params.predictedDirection,
            confidence: params.confidence,
            priceAtPrediction: params.priceAtPrediction,
            targetDate: targetDate.toISOString().split('T')[0],
            regime: params.regime,
        };
        
        const stmt = db.prepare(`
            INSERT INTO predictions (id, timestamp, symbol, predicted_direction, confidence, price_at_prediction, target_date, regime)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            record.id,
            record.timestamp,
            record.symbol,
            record.predictedDirection,
            record.confidence,
            record.priceAtPrediction,
            record.targetDate,
            record.regime || null
        );
        
        return record;
    }
    
    /**
     * Get all prediction records
     */
    static getAll(): PredictionRecord[] {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT id, timestamp, symbol, 
                   predicted_direction as predictedDirection,
                   confidence, 
                   price_at_prediction as priceAtPrediction,
                   target_date as targetDate,
                   regime,
                   actual_direction as actualDirection,
                   price_at_evaluation as priceAtEvaluation,
                   is_correct as isCorrect,
                   evaluated_at as evaluatedAt
            FROM predictions
            ORDER BY timestamp DESC
            LIMIT 500
        `);
        
        const rows = stmt.all() as Array<{
            id: string;
            timestamp: string;
            symbol: string;
            predictedDirection: string;
            confidence: number;
            priceAtPrediction: number;
            targetDate: string;
            regime: string | null;
            actualDirection: string | null;
            priceAtEvaluation: number | null;
            isCorrect: number | null;
            evaluatedAt: string | null;
        }>;
        
        return rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            symbol: row.symbol,
            predictedDirection: row.predictedDirection as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
            confidence: row.confidence,
            priceAtPrediction: row.priceAtPrediction,
            targetDate: row.targetDate,
            regime: row.regime as MarketRegime | undefined,
            actualDirection: row.actualDirection as 'UP' | 'DOWN' | 'FLAT' | undefined,
            priceAtEvaluation: row.priceAtEvaluation ?? undefined,
            isCorrect: row.isCorrect !== null ? Boolean(row.isCorrect) : undefined,
            evaluatedAt: row.evaluatedAt ?? undefined,
        }));
    }
    
    /**
     * Get predictions pending evaluation
     */
    static getPending(): PredictionRecord[] {
        const db = getDatabase();
        const today = new Date().toISOString().split('T')[0];
        
        const stmt = db.prepare(`
            SELECT id, timestamp, symbol,
                   predicted_direction as predictedDirection,
                   confidence,
                   price_at_prediction as priceAtPrediction,
                   target_date as targetDate,
                   regime
            FROM predictions
            WHERE evaluated_at IS NULL AND target_date <= ?
            ORDER BY timestamp DESC
        `);
        
        const rows = stmt.all(today) as Array<{
            id: string;
            timestamp: string;
            symbol: string;
            predictedDirection: string;
            confidence: number;
            priceAtPrediction: number;
            targetDate: string;
            regime: string | null;
        }>;
        
        return rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            symbol: row.symbol,
            predictedDirection: row.predictedDirection as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
            confidence: row.confidence,
            priceAtPrediction: row.priceAtPrediction,
            targetDate: row.targetDate,
            regime: row.regime as MarketRegime | undefined,
        }));
    }
    
    /**
     * Get predictions for a specific symbol
     */
    static getBySymbol(symbol: string): PredictionRecord[] {
        const db = getDatabase();
        const stmt = db.prepare(`
            SELECT id, timestamp, symbol,
                   predicted_direction as predictedDirection,
                   confidence,
                   price_at_prediction as priceAtPrediction,
                   target_date as targetDate,
                   regime,
                   actual_direction as actualDirection,
                   price_at_evaluation as priceAtEvaluation,
                   is_correct as isCorrect,
                   evaluated_at as evaluatedAt
            FROM predictions
            WHERE symbol = ?
            ORDER BY timestamp DESC
        `);
        
        const rows = stmt.all(symbol) as Array<{
            id: string;
            timestamp: string;
            symbol: string;
            predictedDirection: string;
            confidence: number;
            priceAtPrediction: number;
            targetDate: string;
            regime: string | null;
            actualDirection: string | null;
            priceAtEvaluation: number | null;
            isCorrect: number | null;
            evaluatedAt: string | null;
        }>;
        
        return rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            symbol: row.symbol,
            predictedDirection: row.predictedDirection as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
            confidence: row.confidence,
            priceAtPrediction: row.priceAtPrediction,
            targetDate: row.targetDate,
            regime: row.regime as MarketRegime | undefined,
            actualDirection: row.actualDirection as 'UP' | 'DOWN' | 'FLAT' | undefined,
            priceAtEvaluation: row.priceAtEvaluation ?? undefined,
            isCorrect: row.isCorrect !== null ? Boolean(row.isCorrect) : undefined,
            evaluatedAt: row.evaluatedAt ?? undefined,
        }));
    }
    
    /**
     * Update a prediction with evaluation results
     */
    static evaluate(id: string, actualPrice: number): PredictionRecord | null {
        const db = getDatabase();
        
        // Get the record first
        const selectStmt = db.prepare(`
            SELECT id, timestamp, symbol,
                   predicted_direction as predictedDirection,
                   confidence,
                   price_at_prediction as priceAtPrediction,
                   target_date as targetDate,
                   regime
            FROM predictions
            WHERE id = ?
        `);
        
        const row = selectStmt.get(id) as {
            id: string;
            timestamp: string;
            symbol: string;
            predictedDirection: string;
            confidence: number;
            priceAtPrediction: number;
            targetDate: string;
            regime: string | null;
        } | undefined;
        
        if (!row) return null;
        
        const priceChange = actualPrice - row.priceAtPrediction;
        const changePercent = (priceChange / row.priceAtPrediction) * 100;
        
        // Determine actual direction (0.1% threshold for FLAT)
        let actualDirection: 'UP' | 'DOWN' | 'FLAT';
        if (changePercent > 0.1) actualDirection = 'UP';
        else if (changePercent < -0.1) actualDirection = 'DOWN';
        else actualDirection = 'FLAT';
        
        // Check if prediction was correct
        let isCorrect = false;
        if (row.predictedDirection === 'BULLISH' && actualDirection === 'UP') isCorrect = true;
        if (row.predictedDirection === 'BEARISH' && actualDirection === 'DOWN') isCorrect = true;
        if (row.predictedDirection === 'NEUTRAL' && actualDirection === 'FLAT') isCorrect = true;
        
        const evaluatedAt = new Date().toISOString();
        
        // Update the record
        const updateStmt = db.prepare(`
            UPDATE predictions
            SET actual_direction = ?,
                price_at_evaluation = ?,
                is_correct = ?,
                evaluated_at = ?
            WHERE id = ?
        `);
        
        updateStmt.run(actualDirection, actualPrice, isCorrect ? 1 : 0, evaluatedAt, id);
        
        return {
            id: row.id,
            timestamp: row.timestamp,
            symbol: row.symbol,
            predictedDirection: row.predictedDirection as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
            confidence: row.confidence,
            priceAtPrediction: row.priceAtPrediction,
            targetDate: row.targetDate,
            regime: row.regime as MarketRegime | undefined,
            actualDirection,
            priceAtEvaluation: actualPrice,
            isCorrect,
            evaluatedAt,
        };
    }
    
    /**
     * Check if we already logged this symbol today
     */
    static hasLoggedToday(symbol: string): boolean {
        const db = getDatabase();
        const today = new Date().toISOString().split('T')[0];
        
        const stmt = db.prepare(`
            SELECT COUNT(*) as count
            FROM predictions
            WHERE symbol = ? AND date(timestamp) = ?
        `);
        
        const row = stmt.get(symbol, today) as { count: number };
        return row.count > 0;
    }
    
    /**
     * Auto-log prediction if not already logged today
     */
    static autoLog(params: {
        symbol: string;
        predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        confidence: number;
        priceAtPrediction: number;
        regime?: MarketRegime;
    }): boolean {
        if (this.hasLoggedToday(params.symbol)) {
            return false;
        }
        
        // Only log non-neutral predictions with decent confidence
        if (params.predictedDirection === 'NEUTRAL' || params.confidence < 40) {
            return false;
        }
        
        this.log(params);
        return true;
    }
    
    /**
     * Get next trading day (skip weekends)
     */
    private static getNextTradingDay(from: Date): Date {
        const next = new Date(from);
        next.setDate(next.getDate() + 1);
        
        while (next.getDay() === 0 || next.getDay() === 6) {
            next.setDate(next.getDate() + 1);
        }
        
        return next;
    }
    
    /**
     * Clear all records (for testing)
     */
    static clear(): void {
        const db = getDatabase();
        db.exec('DELETE FROM predictions');
    }
}

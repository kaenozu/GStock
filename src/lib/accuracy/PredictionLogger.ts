/**
 * PredictionLogger - Stores predictions for later accuracy evaluation
 * Phase 18: The Mirror
 * 
 * Uses localStorage for persistence (client-side)
 * In production, this would be a database
 */

import { PredictionRecord } from '@/types/accuracy';
import { MarketRegime } from '@/types/market';

const STORAGE_KEY = 'gstock_predictions';
const MAX_RECORDS = 500;
const LAST_LOGGED_KEY = 'gstock_last_logged';
const OBSERVATION_PERIOD_KEY = 'gstock_observation_period';
const DEFAULT_OBSERVATION_PERIOD = 14; // 2 weeks (14 days)

export class PredictionLogger {
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
    };
    
    // Add regime as metadata if available
    if (params.regime) {
      record.regime = params.regime;
    }
    
    const records = this.getAll();
    records.push(record);
    
    // Keep only last MAX_RECORDS
    const trimmed = records.slice(-MAX_RECORDS);
    this.saveAll(trimmed);
    
    return record;
  }
  
  /**
   * Get all prediction records
   */
  static getAll(): PredictionRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Get predictions pending evaluation
   */
  static getPending(): PredictionRecord[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAll().filter(r => 
      !r.evaluatedAt && r.targetDate <= today
    );
  }
  
  /**
   * Get predictions for a specific symbol
   */
  static getBySymbol(symbol: string): PredictionRecord[] {
    return this.getAll().filter(r => r.symbol === symbol);
  }
  
  /**
   * Update a prediction with evaluation results
   */
  static evaluate(id: string, actualPrice: number): PredictionRecord | null {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) return null;
    
    const record = records[index];
    const priceChange = actualPrice - record.priceAtPrediction;
    const changePercent = (priceChange / record.priceAtPrediction) * 100;
    
    // Determine actual direction (0.1% threshold for FLAT)
    let actualDirection: 'UP' | 'DOWN' | 'FLAT';
    if (changePercent > 0.1) actualDirection = 'UP';
    else if (changePercent < -0.1) actualDirection = 'DOWN';
    else actualDirection = 'FLAT';
    
    // Check if prediction was correct
    let isCorrect = false;
    if (record.predictedDirection === 'BULLISH' && actualDirection === 'UP') isCorrect = true;
    if (record.predictedDirection === 'BEARISH' && actualDirection === 'DOWN') isCorrect = true;
    if (record.predictedDirection === 'NEUTRAL' && actualDirection === 'FLAT') isCorrect = true;
    
    // Update record
    records[index] = {
      ...record,
      actualDirection,
      priceAtEvaluation: actualPrice,
      isCorrect,
      evaluatedAt: new Date().toISOString(),
    };
    
    this.saveAll(records);
    return records[index];
  }
  
  /**
   * Clear all records (for testing)
   */
  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_LOGGED_KEY);
  }
  
  /**
   * Check if we already logged this symbol today (prevent duplicates)
   */
  static hasLoggedToday(symbol: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const lastLogged = localStorage.getItem(LAST_LOGGED_KEY);
      if (!lastLogged) return false;
      const data = JSON.parse(lastLogged);
      const today = new Date().toISOString().split('T')[0];
      return data[symbol] === today;
    } catch {
      return false;
    }
  }
  
  /**
   * Mark symbol as logged today
   */
  static markLoggedToday(symbol: string): void {
    if (typeof window === 'undefined') return;
    try {
      const lastLogged = localStorage.getItem(LAST_LOGGED_KEY);
      const data = lastLogged ? JSON.parse(lastLogged) : {};
      const today = new Date().toISOString().split('T')[0];
      data[symbol] = today;
      localStorage.setItem(LAST_LOGGED_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
  
  /**
   * Auto-log prediction if not already logged today
   * Returns true if logged, false if skipped
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
    
    if (params.predictedDirection === 'NEUTRAL' || params.confidence < 40) {
      return false;
    }
    
    this.log(params);
    this.markLoggedToday(params.symbol);
    return true;
  }
  
  /**
   * Get observation period in days
   */
  static getObservationPeriod(): number {
    if (typeof window === 'undefined') return DEFAULT_OBSERVATION_PERIOD;
    try {
      const period = localStorage.getItem(OBSERVATION_PERIOD_KEY);
      return period ? parseInt(period, 10) : DEFAULT_OBSERVATION_PERIOD;
    } catch {
      return DEFAULT_OBSERVATION_PERIOD;
    }
  }
  
  /**
   * Set observation period in days
   */
  static setObservationPeriod(days: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OBSERVATION_PERIOD_KEY, String(days));
  }
  
  /**
   * Get records within observation period
   */
  static getObservationRecords(): PredictionRecord[] {
    const periodDays = this.getObservationPeriod();
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    cutoffDate.setHours(0, 0, 0, 0);
    
    return this.getAll().filter(r => {
      const recordDate = new Date(r.timestamp);
      return recordDate >= cutoffDate && recordDate <= now;
    });
  }
  
  /**
   * Calculate accuracy within observation period
   */
  static getObservationAccuracy(): {
    total: number;
    correct: number;
    accuracy: number;
    byDirection: { BULLISH: number; BEARISH: number; NEUTRAL: number };
    byRegime?: Record<string, { total: number; correct: number }>;
  } {
    const records = this.getObservationRecords();
    const evaluated = records.filter(r => r.evaluatedAt);
    
    const total = evaluated.length;
    const correct = evaluated.filter(r => r.isCorrect).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    
    const byDirection = {
      BULLISH: { total: 0, correct: 0 },
      BEARISH: { total: 0, correct: 0 },
      NEUTRAL: { total: 0, correct: 0 }
    };
    
    evaluated.forEach(r => {
      const direction = r.predictedDirection as keyof typeof byDirection;
      if (byDirection[direction]) {
        byDirection[direction].total++;
        if (r.isCorrect) byDirection[direction].correct++;
      }
    });
    
    return {
      total,
      correct,
      accuracy: Math.round(accuracy),
      byDirection: {
        BULLISH: byDirection.BULLISH.correct,
        BEARISH: byDirection.BEARISH.correct,
        NEUTRAL: byDirection.NEUTRAL.correct
      }
    };
  }
  
  /**
   * Get next trading day (skip weekends)
   */
  private static getNextTradingDay(from: Date): Date {
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    
    // Skip Saturday (6) and Sunday (0)
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  private static saveAll(records: PredictionRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

/**
 * AutoEvaluator - Automatically evaluates pending predictions
 * Phase 19: The Nervous System
 * Updated for Phase 20A: Uses server-side API
 */

import { PredictionClient } from './PredictionClient';
import { PredictionRecord } from '@/types/accuracy';

export class AutoEvaluator {
  private static isRunning = false;
  
  /**
   * Evaluate all pending predictions that are due
   * Fetches current prices and updates records
   */
  static async evaluatePending(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;
    
    try {
      const pending = await PredictionClient.getPending();
      if (pending.length === 0) return 0;
      
      let evaluatedCount = 0;
      
      // Group by symbol to minimize API calls
      const bySymbol = new Map<string, PredictionRecord[]>();
      for (const record of pending) {
        const existing = bySymbol.get(record.symbol) || [];
        existing.push(record);
        bySymbol.set(record.symbol, existing);
      }
      
      // Fetch current price for each symbol and evaluate
      for (const [symbol, records] of bySymbol) {
        try {
          const price = await this.fetchCurrentPrice(symbol);
          if (price > 0) {
            for (const record of records) {
              await PredictionClient.evaluate(record.id, price);
              evaluatedCount++;
            }
          }
        } catch (error) {
          console.error(`AutoEvaluator: Failed to evaluate ${symbol}:`, error);
        }
      }
      
      return evaluatedCount;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Fetch current price for a symbol
   */
  private static async fetchCurrentPrice(symbol: string): Promise<number> {
    try {
      const res = await fetch(`/api/quotes?symbol=${symbol}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.price || 0;
    } catch {
      return 0;
    }
  }
}

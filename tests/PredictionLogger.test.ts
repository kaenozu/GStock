/**
 * PredictionLogger Tests
 * Phase 20A-2: Stability Sprint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage and window
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// Mock window object for Node.js environment
Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
  writable: true,
});
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Import after mock
import { PredictionLogger } from '@/lib/accuracy/PredictionLogger';

describe('PredictionLogger', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('log', () => {
    it('should create a prediction record', () => {
      const record = PredictionLogger.log({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 75,
        priceAtPrediction: 150.00,
      });

      expect(record).toBeDefined();
      expect(record.symbol).toBe('AAPL');
      expect(record.predictedDirection).toBe('BULLISH');
      expect(record.confidence).toBe(75);
      expect(record.priceAtPrediction).toBe(150.00);
      expect(record.id).toContain('AAPL-');
    });

    it('should include regime if provided', () => {
      const record = PredictionLogger.log({
        symbol: 'TSLA',
        predictedDirection: 'BEARISH',
        confidence: 80,
        priceAtPrediction: 200.00,
        regime: 'VOLATILE',
      });

      expect((record as any).regime).toBe('VOLATILE');
    });

    it('should persist records to storage', () => {
      PredictionLogger.log({
        symbol: 'NVDA',
        predictedDirection: 'BULLISH',
        confidence: 65,
        priceAtPrediction: 500.00,
      });

      const records = PredictionLogger.getAll();
      expect(records.length).toBe(1);
      expect(records[0].symbol).toBe('NVDA');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no records', () => {
      const records = PredictionLogger.getAll();
      expect(records).toEqual([]);
    });

    it('should return all logged records', () => {
      PredictionLogger.log({ symbol: 'AAPL', predictedDirection: 'BULLISH', confidence: 70, priceAtPrediction: 150 });
      PredictionLogger.log({ symbol: 'MSFT', predictedDirection: 'BEARISH', confidence: 60, priceAtPrediction: 300 });
      PredictionLogger.log({ symbol: 'GOOGL', predictedDirection: 'NEUTRAL', confidence: 50, priceAtPrediction: 140 });

      const records = PredictionLogger.getAll();
      expect(records.length).toBe(3);
    });
  });

  describe('getBySymbol', () => {
    it('should filter records by symbol', () => {
      PredictionLogger.log({ symbol: 'AAPL', predictedDirection: 'BULLISH', confidence: 70, priceAtPrediction: 150 });
      PredictionLogger.log({ symbol: 'MSFT', predictedDirection: 'BEARISH', confidence: 60, priceAtPrediction: 300 });
      PredictionLogger.log({ symbol: 'AAPL', predictedDirection: 'BEARISH', confidence: 55, priceAtPrediction: 148 });

      const aaplRecords = PredictionLogger.getBySymbol('AAPL');
      expect(aaplRecords.length).toBe(2);
      expect(aaplRecords.every(r => r.symbol === 'AAPL')).toBe(true);
    });
  });

  describe('evaluate', () => {
    it('should mark correct BULLISH prediction', () => {
      const record = PredictionLogger.log({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 70,
        priceAtPrediction: 150.00,
      });

      const evaluated = PredictionLogger.evaluate(record.id, 155.00); // Price went up
      
      expect(evaluated).toBeDefined();
      expect(evaluated!.isCorrect).toBe(true);
      expect(evaluated!.actualDirection).toBe('UP');
      expect(evaluated!.priceAtEvaluation).toBe(155.00);
      expect(evaluated!.evaluatedAt).toBeDefined();
    });

    it('should mark incorrect BULLISH prediction', () => {
      const record = PredictionLogger.log({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 70,
        priceAtPrediction: 150.00,
      });

      const evaluated = PredictionLogger.evaluate(record.id, 145.00); // Price went down
      
      expect(evaluated!.isCorrect).toBe(false);
      expect(evaluated!.actualDirection).toBe('DOWN');
    });

    it('should mark correct BEARISH prediction', () => {
      const record = PredictionLogger.log({
        symbol: 'TSLA',
        predictedDirection: 'BEARISH',
        confidence: 80,
        priceAtPrediction: 200.00,
      });

      const evaluated = PredictionLogger.evaluate(record.id, 190.00); // Price went down
      
      expect(evaluated!.isCorrect).toBe(true);
      expect(evaluated!.actualDirection).toBe('DOWN');
    });

    it('should handle FLAT movement', () => {
      const record = PredictionLogger.log({
        symbol: 'MSFT',
        predictedDirection: 'NEUTRAL',
        confidence: 50,
        priceAtPrediction: 300.00,
      });

      // Price barely moved (within 0.1%)
      const evaluated = PredictionLogger.evaluate(record.id, 300.10);
      
      expect(evaluated!.actualDirection).toBe('FLAT');
      expect(evaluated!.isCorrect).toBe(true);
    });

    it('should return null for non-existent id', () => {
      const result = PredictionLogger.evaluate('non-existent-id', 100);
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all records', () => {
      PredictionLogger.log({ symbol: 'AAPL', predictedDirection: 'BULLISH', confidence: 70, priceAtPrediction: 150 });
      PredictionLogger.log({ symbol: 'MSFT', predictedDirection: 'BEARISH', confidence: 60, priceAtPrediction: 300 });
      
      expect(PredictionLogger.getAll().length).toBe(2);
      
      PredictionLogger.clear();
      
      expect(PredictionLogger.getAll().length).toBe(0);
    });
  });

  describe('hasLoggedToday / markLoggedToday', () => {
    it('should track daily logging', () => {
      expect(PredictionLogger.hasLoggedToday('AAPL')).toBe(false);
      
      PredictionLogger.markLoggedToday('AAPL');
      
      expect(PredictionLogger.hasLoggedToday('AAPL')).toBe(true);
      expect(PredictionLogger.hasLoggedToday('MSFT')).toBe(false);
    });
  });

  describe('autoLog', () => {
    it('should log if not logged today', () => {
      const result = PredictionLogger.autoLog({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 70,
        priceAtPrediction: 150,
      });

      expect(result).toBe(true);
      expect(PredictionLogger.getAll().length).toBe(1);
    });

    it('should skip if already logged today (via markLoggedToday)', () => {
      // First, mark as logged today
      PredictionLogger.markLoggedToday('AAPL');

      // Then try to autoLog - should skip
      const result = PredictionLogger.autoLog({
        symbol: 'AAPL',
        predictedDirection: 'BEARISH',
        confidence: 80,
        priceAtPrediction: 155,
      });

      expect(result).toBe(false);
      expect(PredictionLogger.getAll().length).toBe(0); // No records because skipped
    });

    it('should skip NEUTRAL predictions', () => {
      const result = PredictionLogger.autoLog({
        symbol: 'AAPL',
        predictedDirection: 'NEUTRAL',
        confidence: 50,
        priceAtPrediction: 150,
      });

      expect(result).toBe(false);
      expect(PredictionLogger.getAll().length).toBe(0);
    });

    it('should skip low confidence predictions', () => {
      const result = PredictionLogger.autoLog({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 30, // Below 40 threshold
        priceAtPrediction: 150,
      });

      expect(result).toBe(false);
      expect(PredictionLogger.getAll().length).toBe(0);
    });
  });

  describe('getPending', () => {
    it('should return only unevaluated records past target date', () => {
      // Create a record
      const record = PredictionLogger.log({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 70,
        priceAtPrediction: 150,
      });

      // Get records and manually set target date to yesterday
      const storedData = localStorageMock.getItem('gstock_predictions');
      if (storedData) {
        const records = JSON.parse(storedData);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        records[0].targetDate = yesterday.toISOString().split('T')[0];
        localStorageMock.setItem('gstock_predictions', JSON.stringify(records));
      }

      const pending = PredictionLogger.getPending();
      expect(pending.length).toBe(1);

      // After evaluation, should not be pending
      PredictionLogger.evaluate(record.id, 155);
      const pendingAfter = PredictionLogger.getPending();
      expect(pendingAfter.length).toBe(0);
    });
  });
});

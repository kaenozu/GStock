import { describe, it, expect, beforeEach } from 'vitest';
import { PredictionLogger } from '@/lib/accuracy/PredictionLogger';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
  writable: true,
});
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

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

      expect(record.regime).toBe('VOLATILE');
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
  });

  describe('getPending', () => {
    it('should return only unevaluated records past target date', () => {
      const record = PredictionLogger.log({
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 70,
        priceAtPrediction: 150,
      });

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

      PredictionLogger.evaluate(record.id, 155);
      const pendingAfter = PredictionLogger.getPending();
      expect(pendingAfter.length).toBe(0);
    });
  });

  describe('Observation Period', () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it('should return default observation period (14 days)', () => {
      const period = PredictionLogger.getObservationPeriod();
      expect(period).toBe(14);
    });

    it('should set and get custom observation period', () => {
      PredictionLogger.setObservationPeriod(21);
      const period = PredictionLogger.getObservationPeriod();
      expect(period).toBe(21);
    });

    it('should get records within observation period', () => {
      const baseDate = new Date();
      for (let i = 0; i < 20; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        PredictionLogger.log({
          symbol: 'AAPL',
          predictedDirection: 'BULLISH',
          confidence: 70,
          priceAtPrediction: 150 + i,
        });
      }

      const records = PredictionLogger.getObservationRecords();
      expect(records.length).toBeGreaterThan(0);
    });

    it('should calculate accuracy within observation period', () => {
      localStorageMock.clear();

      const accuracy1 = PredictionLogger.getObservationAccuracy();
      expect(accuracy1.total).toBe(0);
      expect(accuracy1.correct).toBe(0);

      const accuracy2 = PredictionLogger.getObservationAccuracy();
      expect(accuracy2.total).toBe(0);
      expect(accuracy2.correct).toBe(0);

      const baseDate = new Date();
      for (let i = 0; i < 7; i++) {
        const record = PredictionLogger.log({
          symbol: 'TSLA',
          predictedDirection: i % 2 === 0 ? 'BULLISH' : 'BEARISH',
          confidence: 70,
          priceAtPrediction: 200 + i * 10,
        });

        const actualPrice = i % 2 === 0 ? 210 + i * 10 : 190 + i * 10;
        PredictionLogger.evaluate(record.id, actualPrice);
      }

      const accuracy = PredictionLogger.getObservationAccuracy();
      expect(accuracy.total).toBe(7);
      expect(accuracy.correct).toBe(7);
      expect(accuracy.accuracy).toBeGreaterThanOrEqual(90);
    });
  });
});

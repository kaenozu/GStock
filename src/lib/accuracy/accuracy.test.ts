import { describe, it, expect } from 'vitest';
import { PredictionRecord } from '@/types/accuracy';
import { AccuracyCalculator } from './AccuracyCalculator';

describe('AccuracyCalculator', () => {
  const mockRecords: PredictionRecord[] = [
    {
      id: 'test-1',
      timestamp: '2024-01-01T10:00:00Z',
      symbol: 'AAPL',
      predictedDirection: 'BULLISH',
      confidence: 75,
      priceAtPrediction: 150,
      targetDate: '2024-01-02',
      actualDirection: 'UP',
      priceAtEvaluation: 155,
      isCorrect: true,
      evaluatedAt: '2024-01-02T16:00:00Z',
    },
    {
      id: 'test-2',
      timestamp: '2024-01-02T10:00:00Z',
      symbol: 'AAPL',
      predictedDirection: 'BEARISH',
      confidence: 60,
      priceAtPrediction: 155,
      targetDate: '2024-01-03',
      actualDirection: 'UP',
      priceAtEvaluation: 158,
      isCorrect: false,
      evaluatedAt: '2024-01-03T16:00:00Z',
    },
    {
      id: 'test-3',
      timestamp: '2024-01-03T10:00:00Z',
      symbol: 'NVDA',
      predictedDirection: 'BULLISH',
      confidence: 80,
      priceAtPrediction: 500,
      targetDate: '2024-01-04',
      actualDirection: 'UP',
      priceAtEvaluation: 520,
      isCorrect: true,
      evaluatedAt: '2024-01-04T16:00:00Z',
    },
    {
      id: 'test-4',
      timestamp: '2024-01-04T10:00:00Z',
      symbol: 'TSLA',
      predictedDirection: 'BEARISH',
      confidence: 70,
      priceAtPrediction: 200,
      targetDate: '2024-01-05',
      actualDirection: 'DOWN',
      priceAtEvaluation: 190,
      isCorrect: true,
      evaluatedAt: '2024-01-05T16:00:00Z',
    },
  ];

  it('should calculate basic metrics correctly', () => {
    const metrics = AccuracyCalculator.calculate(mockRecords);
    
    expect(metrics.totalPredictions).toBe(4);
    expect(metrics.evaluatedPredictions).toBe(4);
    expect(metrics.correctPredictions).toBe(3);
    expect(metrics.hitRate).toBe(75); // 3/4 = 75%
  });

  it('should calculate bullish accuracy', () => {
    const metrics = AccuracyCalculator.calculate(mockRecords);
    
    // 2 bullish predictions, both correct
    expect(metrics.bullishAccuracy).toBe(100);
  });

  it('should calculate bearish accuracy', () => {
    const metrics = AccuracyCalculator.calculate(mockRecords);
    
    // 2 bearish predictions, 1 correct (50%)
    expect(metrics.bearishAccuracy).toBe(50);
  });

  it('should calculate average confidence', () => {
    const metrics = AccuracyCalculator.calculate(mockRecords);
    
    // (75 + 60 + 80 + 70) / 4 = 71.25
    expect(metrics.averageConfidence).toBeCloseTo(71.3, 0);
  });

  it('should calculate confidence calibration', () => {
    const metrics = AccuracyCalculator.calculate(mockRecords);
    
    // hitRate / averageConfidence = 75 / 71.25 ≈ 1.05
    expect(metrics.confidenceCalibration).toBeGreaterThan(1);
    expect(metrics.confidenceCalibration).toBeLessThan(1.1);
  });

  it('should handle empty records', () => {
    const metrics = AccuracyCalculator.calculate([]);
    
    expect(metrics.totalPredictions).toBe(0);
    expect(metrics.hitRate).toBe(0);
    expect(metrics.bullishAccuracy).toBe(0);
    expect(metrics.bearishAccuracy).toBe(0);
  });

  it('should handle records without evaluation', () => {
    const unevaluatedRecords: PredictionRecord[] = [
      {
        id: 'test-pending',
        timestamp: '2024-01-01T10:00:00Z',
        symbol: 'AAPL',
        predictedDirection: 'BULLISH',
        confidence: 75,
        priceAtPrediction: 150,
        targetDate: '2024-01-02',
      },
    ];
    
    const metrics = AccuracyCalculator.calculate(unevaluatedRecords);
    
    expect(metrics.totalPredictions).toBe(1);
    expect(metrics.evaluatedPredictions).toBe(0);
    expect(metrics.hitRate).toBe(0);
  });
});

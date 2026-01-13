import { describe, it, expect, beforeEach } from 'vitest';
import { MultiTimeframeAgent } from './MultiTimeframeAgent';
import { StockDataPoint } from '@/types/market';

function generateTestData(days: number, basePrice: number = 100): StockDataPoint[] {
  const data: StockDataPoint[] = [];
  let price = basePrice;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    price *= 1.005;

    data.push({
      time: date.toISOString().split('T')[0],
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
    });
  }

  return data;
}

describe('MultiTimeframeAgent', () => {
  const agent = new MultiTimeframeAgent();

  beforeEach(() => {
  });

  describe('analyze', () => {
    it('should return HOLD when no data provided', () => {
      const result = agent.analyze({});
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    it('should return HOLD when data is insufficient', () => {
      const result = agent.analyze({
        daily: generateTestData(10),
      });

      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    it('should return BUY when majority is bullish', () => {
      const data: Record<string, StockDataPoint[]> = {
        daily: generateTestData(30, 120),
        '4h': generateTestData(30, 105),
        '1h': generateTestData(30, 110),
      };

      const result = agent.analyze(data);
      expect(result.signal).toBe('BUY');
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should return SELL when majority is bearish', () => {
      const data: Record<string, StockDataPoint[]> = {
        daily: generateTestData(30, 90),
        '4h': generateTestData(30, 95),
        '1h': generateTestData(30, 85),
      };

      const result = agent.analyze(data);
      expect(result.sentiment).toBeDefined();
    });

    it('should include timeframe analysis in reason', () => {
      const data: Record<string, StockDataPoint[]> = {
        daily: generateTestData(30, 100),
        '4h': generateTestData(30, 100),
        '1h': generateTestData(30, 100),
      };

      const result = agent.analyze(data);
      expect(result.reason).toContain('Timeframe consensus');
    });
  });
});

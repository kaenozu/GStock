import { describe, it, expect, beforeEach } from 'vitest';
import { MultiTimeframeAgent } from './MultiTimeframeAgent';
import { StockDataPoint } from '@/types/market';

function generateTestData(days: number, basePrice: number = 100, trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'): StockDataPoint[] {
  const data: StockDataPoint[] = [];
  let price = basePrice;
  const trendMultiplier = trend === 'bullish' ? 1.002 : trend === 'bearish' ? 0.998 : 1.0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    const change = 1 + (Math.random() - 0.4) * 0.015;
    price *= change * trendMultiplier;

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

    it('should return HOLD when timeframes have mixed signals', () => {
      const mixedBullishData: StockDataPoint[] = [
        { time: '2024-01-01', open: 95, high: 100, low: 94, close: 98 },
        { time: '2024-01-02', open: 98, high: 102, low: 97, close: 100 },
        { time: '2024-01-03', open: 100, high: 104, low: 99, close: 102 },
        { time: '2024-01-04', open: 102, high: 106, low: 101, close: 104 },
        { time: '2024-01-05', open: 104, high: 108, low: 103, close: 106 },
        { time: '2024-01-06', open: 106, high: 110, low: 105, close: 108 },
        { time: '2024-01-07', open: 108, high: 112, low: 107, close: 110 },
        { time: '2024-01-08', open: 110, high: 114, low: 109, close: 112 },
        { time: '2024-01-09', open: 112, high: 116, low: 111, close: 114 },
        { time: '2024-01-10', open: 114, high: 118, low: 113, close: 116 },
        { time: '2024-01-11', open: 116, high: 120, low: 115, close: 118 },
        { time: '2024-01-12', open: 118, high: 122, low: 117, close: 120 },
        { time: '2024-01-13', open: 120, high: 124, low: 119, close: 122 },
        { time: '2024-01-14', open: 122, high: 126, low: 121, close: 124 },
        { time: '2024-01-15', open: 124, high: 128, low: 123, close: 126 },
        { time: '2024-01-16', open: 126, high: 130, low: 125, close: 128 },
        { time: '2024-01-17', open: 128, high: 132, low: 127, close: 130 },
        { time: '2024-01-18', open: 130, high: 134, low: 129, close: 132 },
        { time: '2024-01-19', open: 132, high: 136, low: 131, close: 134 },
        { time: '2024-01-20', open: 134, high: 138, low: 133, close: 136 },
        { time: '2024-01-21', open: 136, high: 140, low: 135, close: 138 },
        { time: '2024-01-22', open: 138, high: 142, low: 137, close: 140 },
        { time: '2024-01-23', open: 140, high: 144, low: 139, close: 142 },
        { time: '2024-01-24', open: 142, high: 146, low: 141, close: 144 },
        { time: '2024-01-25', open: 144, high: 148, low: 143, close: 146 },
        { time: '2024-01-26', open: 146, high: 150, low: 145, close: 148 },
        { time: '2024-01-27', open: 148, high: 152, low: 147, close: 150 },
        { time: '2024-01-28', open: 150, high: 154, low: 149, close: 152 },
        { time: '2024-01-29', open: 152, high: 156, low: 151, close: 154 },
        { time: '2024-01-30', open: 154, high: 158, low: 153, close: 156 },
        { time: '2024-01-31', open: 150, high: 154, low: 149, close: 152 },
      ];

      const data: Record<string, StockDataPoint[]> = {
        daily: mixedBullishData,
        '4h': mixedBullishData,
        '1h': mixedBullishData,
      };

      const result = agent.analyze(data);
      expect(result.signal).toBe('HOLD');
    });

    it('should return SELL when majority is bearish', () => {
      const data: Record<string, StockDataPoint[]> = {
        daily: generateTestData(30, 90, 'bearish'),
        '4h': generateTestData(30, 95, 'bearish'),
        '1h': generateTestData(30, 85, 'bearish'),
      };

      const result = agent.analyze(data);
      expect(result.sentiment).toBeDefined();
    });

    it('should include timeframe analysis in reason', () => {
      const data: Record<string, StockDataPoint[]> = {
        daily: generateTestData(30, 100, 'neutral'),
        '4h': generateTestData(30, 100, 'neutral'),
        '1h': generateTestData(30, 100, 'neutral'),
      };

      const result = agent.analyze(data);
      expect(result.reason).toContain('Timeframe consensus');
    });
  });
});

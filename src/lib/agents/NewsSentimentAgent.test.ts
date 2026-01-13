import { describe, it, expect, beforeEach } from 'vitest';
import { NewsSentimentAgent } from './NewsSentimentAgent';

describe('NewsSentimentAgent', () => {
  const agent = new NewsSentimentAgent();

  beforeEach(() => {
    // Reset any cached sentiment data before each test
    (agent as any).cache?.clear?.();
  });

  describe('analyze', () => {
    it('should return neutral result when no news data provided', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const result = agent.analyze(data);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should analyze positive news sentiment positively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const newsData = [
        "Company reports strong earnings growth, beating expectations", // 3 positives
        "Tech sector sees significant growth in Q4", // 1 positive
        "Analysts upgrade stock rating to buy", // 1 positive
        "Positive regulatory environment supports business expansion" // 1 positive
      ];

      const result = agent.analyze(data, undefined, newsData);
      expect(result.signal).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(20);
      expect(result.reason).toContain('positive');
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should analyze negative news sentiment negatively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 98 - i,
      }));

      const newsData = [
        "Company misses earnings expectations", // 1 negative
        "Regulatory investigation launched", // 1 negative
        "Major product recall announced", // 1 negative
        "Analysts downgrade stock to sell", // 1 negative
        "Economic recession fears" // 1 negative
      ];

      const result = agent.analyze(data, undefined, newsData);
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(20);
      expect(result.reason).toContain('negative');
      expect(result.sentiment).toBe('BEARISH');
    });

    it('should handle mixed news sentiment appropriately', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const newsData = [
        "Company reports moderate earnings growth",
        "Some regulatory concerns raised",
        "Analysts maintain hold rating",
        "Mixed market conditions expected"
      ];

      const result = agent.analyze(data, undefined, newsData);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBeLessThan(50);
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should calculate sentiment score correctly', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const newsData = [
        "Strong positive growth and beating all expectations", // 2 positive
        "Innovation breakthrough expected", // 2 positive  
        "Market expansion plans", // 1 positive
        "Slight competition concerns", // 1 negative
        "Regulatory filing required", // 1 negative
        "Economic uncertainty" // 1 negative
      ];

      const result = agent.analyze(data, undefined, newsData);
      // Net sentiment: 2+2+1-1-1-1 = +2 (positive)
      expect(result.confidence).toBeGreaterThan(15);
      expect(result.reason).toContain('positive');
    });
  });

  describe('interface compliance', () => {
    it('should implement Agent interface correctly', () => {
      expect(agent.id).toBe('news_sentiment_agent');
      expect(agent.name).toBe('News Sentiment Analyzer');
      expect(agent.role).toBe('NEWS');
      expect(typeof agent.analyze).toBe('function');
    });
  });

  describe('sentiment calculation', () => {
    it('should handle edge cases in news data', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      // Empty news data
      const result1 = agent.analyze(data, undefined, []);
      expect(result1.signal).toBe('HOLD');
      expect(result1.confidence).toBe(0);

      // Single news item
      const result2 = agent.analyze(data, undefined, ["Company reports strong growth and beating expectations"]);
      expect(result2.signal).toBe('BUY');
      expect(result2.confidence).toBeGreaterThan(5);

      // Large number of news items
      const largeNewsData = Array.from({ length: 100 }, (_, i) => 
        i % 2 === 0 ? `Positive news ${i}` : `Negative news ${i}`
      );
      const result3 = agent.analyze(data, undefined, largeNewsData);
      expect(['BUY', 'SELL', 'HOLD']).toContain(result3.signal);
    });
  });
});
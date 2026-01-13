import { describe, it, expect, beforeEach } from 'vitest';
import { MacroEconomicAgent } from './MacroEconomicAgent';

describe('MacroEconomicAgent', () => {
  const agent = new MacroEconomicAgent();

  beforeEach(() => {
    // Reset historical data before each test
    (agent as any).historicalData = [];
  });

  describe('analyze', () => {
    it('should return neutral result when no macro data provided', () => {
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
      expect(result.reason).toBe('No macro economic data available');
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should analyze low interest rate scenario positively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const macroData = {
        interestRate: 1.5, // Below low threshold (2.0)
        inflationRate: 1.2, // Below low threshold (1.5)
        gdpGrowth: 3.0, // Above healthy threshold (2.0)
        unemploymentRate: 3.5, // Below low threshold (4.0)
      };

      const result = agent.analyze(data, undefined, macroData);
      expect(result.signal).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should analyze high interest rate scenario negatively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const macroData = {
        interestRate: 5.5, // Above high threshold (4.5)
        inflationRate: 5.0, // Above high threshold (4.0)
        gdpGrowth: 0.5, // Below recession threshold (1.0)
        unemploymentRate: 7.0, // Above high threshold (6.0)
      };

      const result = agent.analyze(data, undefined, macroData);
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reason).toContain('High interest rate');
      expect(result.sentiment).toBe('BEARISH');
    });

    it('should analyze normal macro conditions neutrally', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const macroData = {
        interestRate: 3.5, // Within normal range
        inflationRate: 2.5,
        gdpGrowth: 2.0,
        unemploymentRate: 5.0,
      };

      const result = agent.analyze(data, undefined, macroData);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBeLessThan(30);
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should consider all macro indicators in scoring', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const macroData = {
        interestRate: 2.0, // Very favorable
        inflationRate: 1.5, // Low inflation
        gdpGrowth: 3.0, // Strong growth
        unemploymentRate: 3.5, // Low unemployment
      };

      const result = agent.analyze(data, undefined, macroData);
      expect(result.signal).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(60);
      expect(result.reason).toContain('supports economic growth');
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should handle recessionary macro indicators', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const macroData = {
        interestRate: 5.5, // High interest
        inflationRate: 5.0, // High inflation
        gdpGrowth: 0.5, // Low growth
        unemploymentRate: 7.5, // High unemployment
      };

      const result = agent.analyze(data, undefined, macroData);
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.sentiment).toBe('BEARISH');
    });
  });

  describe('interface compliance', () => {
    it('should implement Agent interface correctly', () => {
      expect(agent.id).toBe('macro_economic_agent');
      expect(agent.name).toBe('Macro Economic Analyzer');
      expect(agent.role).toBe('MACRO');
      expect(typeof agent.analyze).toBe('function');
    });
  });
});
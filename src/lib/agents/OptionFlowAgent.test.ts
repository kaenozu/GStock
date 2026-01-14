import { describe, it, expect, beforeEach } from 'vitest';
import { OptionFlowAgent, OptionFlowData } from './OptionFlowAgent';

describe('OptionFlowAgent', () => {
  const agent = new OptionFlowAgent();

  beforeEach(() => {
    // Reset cached data before each test
    (agent as any).historicalFlows = [];
  });

  describe('analyze', () => {
    it('should return neutral result when no option flow data provided', () => {
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
      expect(result.reason).toBe('No option flow data available');
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should analyze bullish option flow positively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 50000,
        putVolume: 30000,
        callOI: 100000,
        putOI: 80000,
        impliedVolatility: 25.5,
        institutionalActivity: 'HIGH',
        maxPain: 250
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reason).toContain('bullish');
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should analyze bearish option flow negatively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 - i,
        high: 105 - i,
        low: 95 - i,
        close: 98 - i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 15000,
        putVolume: 35000,
        callOI: 50000,
        putOI: 120000,
        impliedVolatility: 15.2,
        institutionalActivity: 'LOW',
        maxPain: -100
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reason).toContain('bearish');
      expect(result.sentiment).toBe('BEARISH');
    });

    it('should analyze high call/put ratio positively', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 60000,
        putVolume: 20000,
        callOI: 80000,
        putOI: 40000,
        impliedVolatility: 30.0,
        institutionalActivity: 'HIGH',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reason).toContain('high call/put ratio');
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should analyze high implied volatility cautiously', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 30000,
        putVolume: 25000,
        callOI: 60000,
        putOI: 50000,
        impliedVolatility: 45.0,
        institutionalActivity: 'MEDIUM',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBeLessThan(50);
      expect(result.reason).toContain('high volatility');
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should analyze balanced flow neutrally', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 35000,
        putVolume: 33000,
        callOI: 70000,
        putOI: 65000,
        impliedVolatility: 20.0,
        institutionalActivity: 'MEDIUM',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBeLessThan(50);
      expect(result.reason).toContain('balanced');
      expect(result.sentiment).toBe('NEUTRAL');
    });

    it('should consider max pain in analysis', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 40000,
        putVolume: 35000,
        callOI: 75000,
        putOI: 80000,
        impliedVolatility: 18.0,
        institutionalActivity: 'HIGH',
        maxPain: -200
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.reason).toContain('max pain');
      expect(result.sentiment).toBe('BEARISH');
    });

    it('should calculate confidence correctly based on multiple factors', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        // Strong bullish signals
        callVolume: 60000,
        putVolume: 15000,
        callOI: 90000,
        putOI: 30000,
        impliedVolatility: 22.0,
        institutionalActivity: 'HIGH',
        maxPain: 100
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.reason).toContain('strong');
      expect(result.sentiment).toBe('BULLISH');
    });

    it('should handle invalid or missing data gracefully', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const invalidOptionFlow = {
        symbol: '',  // Invalid symbol
        date: new Date(),
        callVolume: 0,
        putVolume: 0,
        callOI: 0,
        putOI: 0,
        impliedVolatility: 0,
        institutionalActivity: 'LOW',
      };

      const result = agent.analyze(data, undefined, invalidOptionFlow);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('invalid');
      expect(result.sentiment).toBe('NEUTRAL');
    });
  });

  describe('interface compliance', () => {
    it('should implement Agent interface correctly', () => {
      expect(agent.id).toBe('option_flow_agent');
      expect(agent.name).toBe('Option Flow Analyzer');
      expect(agent.role).toBe('OPTION');
      expect(typeof agent.analyze).toBe('function');
    });
  });

  describe('signal calculation', () => {
    it('should calculate put/call ratio correctly', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 40000,
        putVolume: 20000,
        callOI: 60000,
        putOI: 40000,
        impliedVolatility: 25.0,
        institutionalActivity: 'MEDIUM',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      // put/call ratio = 40000/60000 = 0.67 (< 1)
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeGreaterThan(30);
      expect(result.reason).toContain('sell pressure');
    });

    it('should use implied volatility as risk factor', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 30000,
        putVolume: 25000,
        callOI: 70000,
        putOI: 50000,
        impliedVolatility: 35.0, // High volatility
        institutionalActivity: 'HIGH',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.confidence).toBeLessThan(50); // High volatility reduces confidence
      expect(result.reason).toContain('high volatility');
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
    });

    it('should consider institutional activity significantly', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 50000,
        putVolume: 40000,
        callOI: 80000,
        putOI: 60000,
        impliedVolatility: 20.0,
        institutionalActivity: 'LOW',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('BUY');
      expect(result.confidence).toBeGreaterThan(40);
      expect(result.confidence).toBeLessThan(60); // Low activity reduces confidence
      expect(result.reason).toContain('bullish');
    });
  });

  describe('edge cases', () => {
    it('should handle zero volumes gracefully', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const optionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 0,
        putVolume: 0,
        callOI: 0,
        putOI: 0,
        impliedVolatility: 0,
        institutionalActivity: 'LOW',
      };

      const result = agent.analyze(data, undefined, optionFlow);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
      expect(result.reason).toContain('no activity');
    });

    it('should handle extreme values', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
      }));

      const extremeOptionFlow: OptionFlowData = {
        symbol: 'AAPL',
        date: new Date(),
        callVolume: 100000, // Very high volume
        putVolume: 80000,  // High put volume
        callOI: 120000, // Very high call OI
        putOI: 100000, // Very high put OI
        impliedVolatility: 60.0, // Very high volatility
        institutionalActivity: 'HIGH',
        maxPain: -500,
      };

      const result = agent.analyze(data, undefined, extremeOptionFlow);
      expect(result.signal).toBe('SELL');
      expect(result.confidence).toBeLessThan(40); // Extreme values reduce confidence
      expect(result.reason).toContain('extreme');
    });
  });
});
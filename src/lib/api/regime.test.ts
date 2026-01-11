import { describe, it, expect } from 'vitest';
import { calculateAdvancedPredictions } from './prediction-engine';
import { StockDataPoint } from '@/types/market';

// Helper to generate mock data with specific characteristics
const generateTrendData = (length: number, trend: 'UP' | 'DOWN' | 'SIDEWAYS', volatility = 0.5): StockDataPoint[] => {
    let price = 100;
    const data: StockDataPoint[] = [];
    for (let i = 0; i < length; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (length - i));

        let change = 0;
        if (trend === 'UP') change = 0.5; // Gentler up
        if (trend === 'DOWN') change = -0.5; // Gentler down
        if (trend === 'SIDEWAYS') change = Math.sin(i / 5) * 0.2;

        price += change + (Math.random() - 0.5) * volatility;

        data.push({
            time: date.toISOString().split('T')[0],
            open: price - 0.1,
            high: price + 0.2,
            low: price - 0.2,
            close: price
        });
    }
    return data;
};

describe('Market Regime Detection', () => {
    it('should detect BULL_TREND', () => {
        // Create 60 days of strong uptrend
        const data = generateTrendData(60, 'UP');
        const result = calculateAdvancedPredictions(data);
        // Expecting BULL_TREND because ADX should be high and MAs aligned
        expect(result.marketRegime).toBe('BULL_TREND');
    });

    it('should detect BEAR_TREND', () => {
        // Create 60 days of strong downtrend
        const data = generateTrendData(60, 'DOWN');
        const result = calculateAdvancedPredictions(data);
        expect(result.marketRegime).toBe('BEAR_TREND');
    });

    // Squeeze logic test requires careful data crafting (very low volatility) which is hard with random.
    // However, SIDEWAYS is default.
    it('should likely be SIDEWAYS or SQUEEZE for ranging data', () => {
        const data = generateTrendData(60, 'SIDEWAYS');
        const result = calculateAdvancedPredictions(data);
        // Low volatility ranging often triggers SQUEEZE or SIDEWAYS
        expect(['SIDEWAYS', 'SQUEEZE']).toContain(result.marketRegime);
    });
});

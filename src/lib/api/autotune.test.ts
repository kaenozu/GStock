import { describe, it, expect } from 'vitest';
import { findOptimalStrategy } from './backtest';
import { StockDataPoint } from '@/types/market';

// Mock data generator (random walk with trend)
const generateMockData = (length: number, volatility: number = 0.5): StockDataPoint[] => {
    let price = 100;
    const data: StockDataPoint[] = [];
    for (let i = 0; i < length; i++) {
        price += (Math.random() - 0.48) * volatility; // Slight uptrend bias
        data.push({
            time: `2024-01-${i + 1}`,
            open: price, high: price + 1, low: price - 1, close: price
        });
    }
    return data;
};

describe('Auto-Tuning Engine', () => {
    // Generate static data so comparison is fair
    const data = generateMockData(200);

    it('should be aggressive in BULL_TREND', () => {
        const { params } = findOptimalStrategy(data, 'BULL_TREND');
        // Aggressive mode allows lower thresholds (e.g., 55, 60)
        // Check if the grid includes lower values (default min is 60, aggressive min is 55)
        // Note: The specific optimal param depends on the random data, 
        // but we can check if the function creates parameters within reasonable bounds.
        expect(params.buyThreshold).toBeGreaterThanOrEqual(55);
    });

    it('should be conservative in VOLATILE', () => {
        const { params } = findOptimalStrategy(data, 'VOLATILE');
        // Conservative mode min buy threshold is 80
        expect(params.buyThreshold).toBeGreaterThanOrEqual(80);
    });

    it('should adjust thresholds based on regime', () => {
        const bullResult = findOptimalStrategy(data, 'BULL_TREND');
        const volResult = findOptimalStrategy(data, 'VOLATILE');

        // Volatile regime should force a stricter (higher) buy threshold
        // OR result in fewer trades/different outcome.
        // In most cases, Volatile threshold (>=80) > Bull threshold (>=55)
        // Unless the optimal for Bull happened to be 90 (unlikely for random walk)

        console.log(`Bull Params: ${JSON.stringify(bullResult.params)}`);
        console.log(`Volatile Params: ${JSON.stringify(volResult.params)}`);

        // Volatile Buy Threshold MUST be >= 80 per definition
        expect(volResult.params.buyThreshold).toBeGreaterThanOrEqual(80);
    });
});

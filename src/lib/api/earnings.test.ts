import { describe, it, expect } from 'vitest';
import { EarningsData, EarningsEvent } from '@/types/market';

// Mock earnings data structure test
describe('Earnings Tracker Types', () => {
    it('should have correct EarningsEvent structure', () => {
        const event: EarningsEvent = {
            date: '2024-01-31',
            epsEstimate: 1.50,
            epsActual: 1.65,
            revenueEstimate: 50000000000,
            revenueActual: 52000000000,
            surprise: 10.0,
            period: 'Q1 2024',
        };

        expect(event.date).toBe('2024-01-31');
        expect(event.epsActual).toBeGreaterThan(event.epsEstimate!);
        expect(event.surprise).toBe(10.0);
        expect(event.period).toMatch(/Q[1-4] \d{4}/);
    });

    it('should have correct EarningsData structure', () => {
        const data: EarningsData = {
            symbol: 'AAPL',
            nextEarningsDate: '2024-04-25',
            history: [
                {
                    date: '2024-01-31',
                    epsEstimate: 1.50,
                    epsActual: 1.65,
                    revenueEstimate: null,
                    revenueActual: null,
                    surprise: 10.0,
                    period: 'Q1 2024',
                },
            ],
        };

        expect(data.symbol).toBe('AAPL');
        expect(data.nextEarningsDate).toBe('2024-04-25');
        expect(data.history).toHaveLength(1);
    });

    it('should handle null values for missing data', () => {
        const event: EarningsEvent = {
            date: '2024-01-31',
            epsEstimate: null,
            epsActual: null,
            revenueEstimate: null,
            revenueActual: null,
            surprise: null,
            period: 'Q1 2024',
        };

        expect(event.epsEstimate).toBeNull();
        expect(event.epsActual).toBeNull();
        expect(event.surprise).toBeNull();
    });

    it('should calculate earnings surprise correctly', () => {
        const epsActual = 1.65;
        const epsEstimate = 1.50;
        const surprise = ((epsActual - epsEstimate) / epsEstimate) * 100;

        expect(surprise).toBeCloseTo(10.0, 1);
    });

    it('should identify beat vs miss', () => {
        const beatEvent: EarningsEvent = {
            date: '2024-01-31',
            epsEstimate: 1.50,
            epsActual: 1.65,
            revenueEstimate: null,
            revenueActual: null,
            surprise: 10.0,
            period: 'Q1 2024',
        };

        const missEvent: EarningsEvent = {
            date: '2024-01-31',
            epsEstimate: 1.50,
            epsActual: 1.35,
            revenueEstimate: null,
            revenueActual: null,
            surprise: -10.0,
            period: 'Q1 2024',
        };

        expect(beatEvent.surprise!).toBeGreaterThan(0); // Beat
        expect(missEvent.surprise!).toBeLessThan(0);    // Miss
    });
});

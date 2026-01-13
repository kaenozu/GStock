/**
 * VolatilityAgent Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { VolatilityAgent } from './VolatilityAgent';
import { StockDataPoint, MarketRegime } from '@/types/market';

/**
 * テスト用の株価データを生成
 */
function generateTestData(
    days: number,
    volatility: 'high' | 'low' | 'normal',
    trend: 'up' | 'down' | 'sideways' = 'sideways',
    basePrice: number = 100
): StockDataPoint[] {
    const data: StockDataPoint[] = [];
    let price = basePrice;

    const volMultiplier = volatility === 'high' ? 5 : volatility === 'low' ? 0.5 : 1;

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        if (trend === 'up') {
            price *= 1.01;
        } else if (trend === 'down') {
            price *= 0.99;
        }

        const range = price * 0.02 * volMultiplier;

        data.push({
            time: date.toISOString().split('T')[0],
            open: price - range / 2,
            high: price + range,
            low: price - range,
            close: price,
        });
    }

    return data;
}

describe('VolatilityAgent', () => {
    const agent = new VolatilityAgent();

    describe('analyze', () => {
        it('データが不足している場合はHOLDを返す', () => {
            const data = generateTestData(30, 'normal');
            const result = agent.analyze(data);

            expect(result.signal).toBe('HOLD');
            expect(result.confidence).toBe(0);
        });

        it('SQUEEZE regimeではブレイクアウトを待つ', () => {
            const data = generateTestData(100, 'low');
            const regime: MarketRegime = 'SQUEEZE';
            const result = agent.analyze(data, regime);

            expect(result.signal).toBe('HOLD');
            expect(result.reason).toContain('Squeeze Active');
        });

        it('高ボラティリティ+上昇トレンドでBUY', () => {
            const data = generateTestData(100, 'high', 'up');
            const regime: MarketRegime = 'BULL_TREND';
            const result = agent.analyze(data, regime);

            if (result.reason.includes('Breakout (Up)')) {
                expect(result.signal).toBe('BUY');
                expect(result.sentiment).toBe('BULLISH');
            }
        });

        it('高ボラティリティ+下落トレンドでSELL', () => {
            const data = generateTestData(100, 'high', 'down');
            const regime: MarketRegime = 'BEAR_TREND';
            const result = agent.analyze(data, regime);

            if (result.reason.includes('Breakout (Down)')) {
                expect(result.signal).toBe('SELL');
                expect(result.sentiment).toBe('BEARISH');
            }
        });

        it('roleがVOLATILEである', () => {
            const data = generateTestData(100, 'normal');
            const result = agent.analyze(data);

            expect(result.role).toBe('VOLATILE');
            expect(result.name).toBe('Hunter (Volatility)');
        });

        it('低ボラティリティでは様子見', () => {
            const data = generateTestData(100, 'low');
            const result = agent.analyze(data);

            if (result.reason.includes('Low Volatility')) {
                expect(result.signal).toBe('HOLD');
            }
        });
    });
});

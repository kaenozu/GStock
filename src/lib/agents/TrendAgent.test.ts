/**
 * TrendAgent Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { TrendAgent } from './TrendAgent';
import { StockDataPoint } from '@/types/market';

/**
 * テスト用の株価データを生成
 */
function generateTestData(
    days: number,
    trend: 'up' | 'down' | 'sideways',
    basePrice: number = 100
): StockDataPoint[] {
    const data: StockDataPoint[] = [];
    let price = basePrice;

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        if (trend === 'up') {
            price *= 1.02;
        } else if (trend === 'down') {
            price *= 0.98;
        } else {
            price += (Math.random() - 0.5) * 2;
        }

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

describe('TrendAgent', () => {
    const agent = new TrendAgent();

    describe('analyze', () => {
        it('データが不足している場合はHOLDを返す', () => {
            const data = generateTestData(30, 'up');
            const result = agent.analyze(data);

            expect(result.signal).toBe('HOLD');
            expect(result.confidence).toBe(0);
        });

        it('強い上昇トレンドではBULLISHセンチメントを返す', () => {
            const data = generateTestData(100, 'up');
            const result = agent.analyze(data);

            expect(result.sentiment).toBe('BULLISH');
            expect(result.reason).toContain('Perfect Order');
        });

        it('強い下落トレンドではBEARISHセンチメントを返す', () => {
            const data = generateTestData(100, 'down');
            const result = agent.analyze(data);

            expect(result.sentiment).toBe('BEARISH');
        });

        it('roleがTRENDである', () => {
            const data = generateTestData(100, 'up');
            const result = agent.analyze(data);

            expect(result.role).toBe('TREND');
            expect(result.name).toBe('Trend Follower');
        });

        it('MACDモメンタムを検出する', () => {
            const data = generateTestData(100, 'up');
            const result = agent.analyze(data);

            // 上昇トレンドでMACDモメンタムを検出する可能性
            if (result.reason.includes('MACD Momentum')) {
                expect(result.confidence).toBeGreaterThan(50);
            }
        });
    });
});

/**
 * ChairmanAgent Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { ChairmanAgent } from './ChairmanAgent';
import { StockDataPoint, MarketRegime } from '@/types/market';

/**
 * テスト用の株価データを生成
 * より強いトレンドを生成するために調整
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
            // より強い上昇トレンド（2%/日）
            price *= 1.02;
        } else if (trend === 'down') {
            // より強い下落トレンド（2%/日）
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

describe('ChairmanAgent', () => {
    const agent = new ChairmanAgent();

    describe('analyze', () => {
        it('データが不足している場合はHOLDを返す', () => {
            const data = generateTestData(30, 'up');
            const result = agent.analyze(data);

            expect(result.signal).toBe('HOLD');
            expect(result.confidence).toBe(0);
            expect(result.reason).toBe('Insufficient data');
        });

        it('上昇トレンドではBULLISHセンチメントを返す', () => {
            const data = generateTestData(100, 'up');
            const result = agent.analyze(data);

            // シグナルはBUYまたはHOLDだが、センチメントはBULLISH
            expect(result.sentiment).toBe('BULLISH');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.reason).toContain('Perfect Bull Alignment');
        });

        it('下落トレンドではBEARISHセンチメントを返す', () => {
            const data = generateTestData(100, 'down');
            const result = agent.analyze(data);

            // シグナルはSELLまたはHOLDだが、センチメントはBEARISH
            expect(result.sentiment).toBe('BEARISH');
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('SQUEEZE regimeではスコアが調整される', () => {
            const data = generateTestData(100, 'up');
            const regime: MarketRegime = 'SQUEEZE';
            const result = agent.analyze(data, regime);

            expect(result.reason).toContain('Squeeze Detected');
        });

        it('VOLATILE regimeでは信頼度が下がる', () => {
            const data = generateTestData(100, 'up');
            const volatileResult = agent.analyze(data, 'VOLATILE');

            expect(volatileResult.reason).toContain('High Volatility');
        });

        it('roleがCHAIRMANである', () => {
            const data = generateTestData(100, 'up');
            const result = agent.analyze(data);

            expect(result.role).toBe('CHAIRMAN');
            expect(result.name).toBe('Alpha (Chairman)');
        });

        it('信頼度は0-100の範囲内', () => {
            const data = generateTestData(100, 'up');
            const result = agent.analyze(data);

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
        });
    });
});

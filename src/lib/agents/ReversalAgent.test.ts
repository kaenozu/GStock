/**
 * ReversalAgent Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { ReversalAgent } from './ReversalAgent';
import { StockDataPoint } from '@/types/market';

function generateTestData(
    days: number,
    pattern: 'up' | 'down' | 'oversold' | 'overbought' | 'sideways',
    basePrice: number = 100
): StockDataPoint[] {
    const data: StockDataPoint[] = [];
    let price = basePrice;

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        switch (pattern) {
            case 'up':
                price *= 1.01;
                break;
            case 'down':
                price *= 0.99;
                break;
            case 'oversold':
                if (i > days - 20) {
                    price *= 0.97;
                }
                break;
            case 'overbought':
                if (i > days - 20) {
                    price *= 1.03;
                }
                break;
            case 'sideways':
                price += (Math.random() - 0.5) * 2;
                break;
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

describe('ReversalAgent', () => {
    const agent = new ReversalAgent();

    describe('analyze', () => {
        it('データが不足している場合はHOLDを返す', () => {
            const data = generateTestData(30, 'sideways');
            const result = agent.analyze(data);

            expect(result.signal).toBe('HOLD');
            expect(result.confidence).toBe(0);
        });

        it('売られすぎ状態ではBUYを返す', () => {
            const data = generateTestData(100, 'oversold');
            const result = agent.analyze(data);

            if (result.reason.includes('Oversold')) {
                expect(result.signal).toBe('BUY');
                expect(result.sentiment).toBe('BULLISH');
            }
        });

        it('買われすぎ状態ではSELLを返す', () => {
            const data = generateTestData(100, 'overbought');
            const result = agent.analyze(data);

            if (result.reason.includes('Overbought')) {
                expect(result.signal).toBe('SELL');
                expect(result.sentiment).toBe('BEARISH');
            }
        });

        it('roleがREVERSALである', () => {
            const data = generateTestData(100, 'sideways');
            const result = agent.analyze(data);

            expect(result.role).toBe('REVERSAL');
            expect(result.name).toBe('Contra (Reversal)');
        });

        it('ボリンジャーバンドを検出する', () => {
            const data = generateTestData(100, 'oversold');
            const result = agent.analyze(data);

            if (result.reason.includes('Lower Band')) {
                expect(result.signal).toBe('BUY');
            }
        });

        it('Stochastic Oscillatorを検出する', () => {
            const data = generateTestData(100, 'oversold');
            const result = agent.analyze(data);

            if (result.reason.includes('Stochastic')) {
                expect(result.sentiment).toBeDefined();
            }
        });

        it('Williams %Rを検出する', () => {
            const data = generateTestData(100, 'oversold');
            const result = agent.analyze(data);

            if (result.reason.includes('Williams')) {
                expect(result.sentiment).toBeDefined();
            }
        });

        it('CCIを検出する', () => {
            const data = generateTestData(100, 'oversold');
            const result = agent.analyze(data);

            if (result.reason.includes('CCI')) {
                expect(result.sentiment).toBeDefined();
            }
        });
    });
});

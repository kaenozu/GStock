/**
 * StockAnalyzer Tests
 * @description 分析ロジックのユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { StockAnalyzer } from './StockAnalyzer';
import { StockDataPoint } from '@/types/market';

// テスト用のモックデータ生成
function generateMockData(days: number, trend: 'up' | 'down' | 'sideways' = 'sideways'): StockDataPoint[] {
    const data: StockDataPoint[] = [];
    let price = 100;

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        let change = (Math.random() - 0.5) * 4;
        if (trend === 'up') change += 2.0; // Increased bias from 0.5 to 2.0
        if (trend === 'down') change -= 2.0;

        price = Math.max(10, price + change);
        const high = price + Math.random() * 2;
        const low = price - Math.random() * 2;

        data.push({
            time: date.toISOString().split('T')[0],
            open: price - Math.random(),
            high,
            low,
            close: price
        });
    }

    return data;
}

describe('StockAnalyzer', () => {
    describe('calculateRSI', () => {
        it('十分なデータがない場合は50を返す', () => {
            const closes = [100, 101, 102];
            const rsi = StockAnalyzer.calculateRSI(closes);
            expect(rsi).toBe(50);
        });

        it('RSIは0-100の範囲内である', () => {
            const closes = Array(20).fill(0).map((_, i) => 100 + i);
            const rsi = StockAnalyzer.calculateRSI(closes);
            expect(rsi).toBeGreaterThanOrEqual(0);
            expect(rsi).toBeLessThanOrEqual(100);
        });

        it('上昇トレンドでRSIが高くなる', () => {
            const uptrend = Array(20).fill(0).map((_, i) => 100 + i * 2);
            const downtrend = Array(20).fill(0).map((_, i) => 140 - i * 2);

            const rsiUp = StockAnalyzer.calculateRSI(uptrend);
            const rsiDown = StockAnalyzer.calculateRSI(downtrend);

            expect(rsiUp).toBeGreaterThan(rsiDown);
        });
    });

    describe('calculateADX', () => {
        it('十分なデータがない場合は20を返す', () => {
            const data = generateMockData(5);
            const adx = StockAnalyzer.calculateADX(data);
            expect(adx).toBe(20);
        });

        it('ADXは正の数値を返す', () => {
            const data = generateMockData(30);
            const adx = StockAnalyzer.calculateADX(data);
            expect(adx).toBeGreaterThanOrEqual(0);
        });
    });

    describe('calculateSMA', () => {
        it('SMAを正しく計算する', () => {
            const values = [10, 20, 30, 40, 50];
            const sma = StockAnalyzer.calculateSMA(values, 5);
            expect(sma).toBe(30); // (10+20+30+40+50)/5
        });

        it('データが期間未満の場合は最後の値を返す', () => {
            const values = [100, 110];
            const sma = StockAnalyzer.calculateSMA(values, 5);
            expect(sma).toBe(110);
        });
    });

    describe('analyze', () => {
        it('データが少ない場合はニュートラルを返す', () => {
            const data = generateMockData(10);
            const result = StockAnalyzer.analyze(data);

            expect(result.sentiment).toBe('NEUTRAL');
            expect(result.confidence).toBe(50);
            expect(result.regime).toBe('SIDEWAYS');
        });

        it('十分なデータで有効な分析結果を返す', () => {
            const data = generateMockData(50);
            const result = StockAnalyzer.analyze(data);

            expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(result.sentiment);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
            expect(result.rsi).toBeGreaterThanOrEqual(0);
            expect(result.rsi).toBeLessThanOrEqual(100);
            expect(result.adx).toBeGreaterThanOrEqual(0);
        });

        it('上昇トレンドでBULLISHを返す傾向がある', () => {
            const data = generateMockData(50, 'up');
            const result = StockAnalyzer.analyze(data);

            // 強い上昇トレンドならBULLISHの可能性が高い
            // ただしランダム性があるので必ずしもそうならない
            expect(['BULLISH', 'NEUTRAL']).toContain(result.sentiment);
        });
    });

    describe('createAnalysisResult', () => {
        it('完全な分析結果を生成する', () => {
            const data = generateMockData(50);
            const result = StockAnalyzer.createAnalysisResult('AAPL', data);

            expect(result.symbol).toBe('AAPL');
            expect(result.history).toHaveLength(50);
            expect(result).toHaveProperty('predictions');
            expect(result).toHaveProperty('sentiment');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('marketRegime');
            expect(result).toHaveProperty('stats');
            expect(result.stats).toHaveProperty('price');
            expect(result.stats).toHaveProperty('rsi');
            expect(result.stats).toHaveProperty('adx');
        });

        it('空のデータでエラーにならない', () => {
            const result = StockAnalyzer.createAnalysisResult('AAPL', []);

            expect(result.symbol).toBe('AAPL');
            expect(result.sentiment).toBe('NEUTRAL');
            expect(result.confidence).toBe(50);
        });
    });
});

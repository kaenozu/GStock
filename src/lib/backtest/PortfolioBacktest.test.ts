/**
 * Portfolio Backtest Tests
 */

import { describe, it, expect } from 'vitest';
import {
    runPortfolioBacktest,
    PortfolioBacktestConfig,
    PORTFOLIO_TEMPLATES,
} from './PortfolioBacktest';
import { StockDataPoint } from '@/types/market';

/**
 * テスト用の株価データを生成
 */
function generateTestData(
    days: number,
    startPrice: number,
    dailyReturn: number // 日次リターン（例: 0.001 = 0.1%）
): StockDataPoint[] {
    const data: StockDataPoint[] = [];
    let price = startPrice;

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        price *= (1 + dailyReturn);

        data.push({
            time: date.toISOString().split('T')[0],
            open: price * 0.99,
            high: price * 1.01,
            low: price * 0.98,
            close: price,
        });
    }

    return data;
}

describe('PortfolioBacktest', () => {
    describe('runPortfolioBacktest', () => {
        it('基本的なバックテストが実行できる', () => {
            const dataMap: Record<string, StockDataPoint[]> = {
                'AAPL': generateTestData(100, 150, 0.001), // +0.1%/日
                'MSFT': generateTestData(100, 300, 0.0005), // +0.05%/日
            };

            const config: PortfolioBacktestConfig = {
                assets: [
                    { symbol: 'AAPL', weight: 50 },
                    { symbol: 'MSFT', weight: 50 },
                ],
                initialCapital: 10000,
                periodDays: 100,
            };

            const result = runPortfolioBacktest(config, dataMap);

            expect(result.initialCapital).toBe(10000);
            expect(result.finalValue).toBeGreaterThan(10000); // 上昇データなので増加
            expect(result.totalReturnPercent).toBeGreaterThan(0);
            expect(result.assetResults).toHaveLength(2);
            expect(result.portfolioHistory.length).toBeGreaterThan(0);
        });

        it('配分比率の合計が100%でない場合はエラー', () => {
            const dataMap: Record<string, StockDataPoint[]> = {
                'AAPL': generateTestData(100, 150, 0.001),
            };

            const config: PortfolioBacktestConfig = {
                assets: [
                    { symbol: 'AAPL', weight: 50 }, // 50%のみ
                ],
                initialCapital: 10000,
                periodDays: 100,
            };

            expect(() => runPortfolioBacktest(config, dataMap)).toThrow('Weight sum must be 100%');
        });

        it('データがない銘柄はエラー', () => {
            const dataMap: Record<string, StockDataPoint[]> = {
                'AAPL': generateTestData(100, 150, 0.001),
            };

            const config: PortfolioBacktestConfig = {
                assets: [
                    { symbol: 'AAPL', weight: 50 },
                    { symbol: 'UNKNOWN', weight: 50 },
                ],
                initialCapital: 10000,
                periodDays: 100,
            };

            expect(() => runPortfolioBacktest(config, dataMap)).toThrow('Insufficient common dates for backtest');
        });

        it('最大ドローダウンが計算される', () => {
            // 下落トレンドのデータ
            const dataMap: Record<string, StockDataPoint[]> = {
                'AAPL': generateTestData(100, 150, -0.005), // -0.5%/日
            };

            const config: PortfolioBacktestConfig = {
                assets: [
                    { symbol: 'AAPL', weight: 100 },
                ],
                initialCapital: 10000,
                periodDays: 100,
            };

            const result = runPortfolioBacktest(config, dataMap);

            expect(result.maxDrawdown).toBeGreaterThan(0);
            expect(result.totalReturnPercent).toBeLessThan(0);
        });

        it('手数料が考慮される', () => {
            const dataMap: Record<string, StockDataPoint[]> = {
                'AAPL': generateTestData(100, 150, 0),// 横ばい
            };

            const config: PortfolioBacktestConfig = {
                assets: [
                    { symbol: 'AAPL', weight: 100 },
                ],
                initialCapital: 10000,
                periodDays: 100,
                commissionRate: 0.01, // 1%
            };

            const result = runPortfolioBacktest(config, dataMap);

            expect(result.totalCommission).toBe(100); // 10000 * 0.01
            expect(result.finalValue).toBeLessThan(10000); // 手数料分減少
        });
    });

    describe('PORTFOLIO_TEMPLATES', () => {
        it('テンプレートの配分比率が100%になる', () => {
            for (const [name, assets] of Object.entries(PORTFOLIO_TEMPLATES)) {
                const total = (assets as any[]).reduce((sum: number, a: any) => sum + a.weight, 0);
                expect(total).toBe(100);
            }
        });
    });
});

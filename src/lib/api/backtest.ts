/**
 * Backtest Engine
 * @description バックテストシミュレーションと最適化
 * @module lib/api/backtest
 */

import { StockDataPoint, BacktestResult, ChartMarker, MarketRegime } from '@/types/market';
import { calculateHistoricalSignals } from './prediction-engine';

/** バックテストパラメータ */
export interface BacktestParams {
    /** 買いエントリーの信頼度閾値 */
    buyThreshold: number;
    /** 売りエグジットの信頼度閾値 */
    sellThreshold: number;
}

/** 最適化結果 */
export interface OptimizationResult {
    params: BacktestParams;
    result: BacktestResult;
}

/** 取引コスト設定 */
interface TradingCosts {
    /** 手数料率（片道） */
    commissionRate: number;
    /** スリッページ率 */
    slippageRate: number;
}

/** デフォルトの取引コスト */
const DEFAULT_COSTS: TradingCosts = {
    commissionRate: 0.001, // 0.1%
    slippageRate: 0.0005, // 0.05%
};

/** AIシグナルの型 */
interface AISignal {
    price: number;
    time: string;
    confidence: number;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * シミュレーション実行コア関数
 * @param data - 株価データ
 * @param aiSignals - AIシグナル
 * @param params - バックテストパラメータ
 * @param initialBalance - 初期資金
 * @param costs - 取引コスト
 * @returns バックテスト結果
 */
const runSimulation = (
    data: StockDataPoint[],
    aiSignals: AISignal[],
    params: BacktestParams,
    initialBalance: number,
    costs: TradingCosts = DEFAULT_COSTS
): BacktestResult => {
    let balance = initialBalance;
    let position: { entryPrice: number; amount: number } | null = null;
    let winCount = 0;
    let tradeCount = 0;
    let totalCommission = 0;
    const markers: ChartMarker[] = [];

    const { buyThreshold, sellThreshold } = params;
    const { commissionRate, slippageRate } = costs;

    for (const signal of aiSignals) {
        const basePrice = signal.price;
        const currentTime = signal.time;
        const confidence = signal.confidence;
        const sentiment = signal.sentiment;

        // ENTRY（買い）
        if (position === null && sentiment === 'BULLISH' && confidence >= buyThreshold) {
            // スリッページを適用（不利な方向）
            const executionPrice = basePrice * (1 + slippageRate);
            const grossAmount = balance;
            const commission = grossAmount * commissionRate;
            totalCommission += commission;

            const availableForPurchase = balance - commission;
            const amount = availableForPurchase / executionPrice;
            position = { entryPrice: executionPrice, amount };
            balance = 0;

            markers.push({
                time: currentTime,
                position: 'belowBar',
                color: '#2196F3',
                shape: 'arrowUp',
                text: `BUY (AI:${confidence}%)`,
                size: 2
            });
        }
        // EXIT（売り）
        else if (position !== null) {
            const shouldSell = (sentiment === 'BEARISH') ||
                (sentiment === 'BULLISH' && confidence <= sellThreshold);

            if (shouldSell) {
                // スリッページを適用（不利な方向）
                const executionPrice = basePrice * (1 - slippageRate);
                const grossValue = position.amount * executionPrice;
                const commission = grossValue * commissionRate;
                totalCommission += commission;

                const netValue = grossValue - commission;
                const profit = netValue - (position.amount * position.entryPrice);

                if (profit > 0) winCount++;
                tradeCount++;

                balance = netValue;
                position = null;

                markers.push({
                    time: currentTime,
                    position: 'aboveBar',
                    color: profit > 0 ? '#4CAF50' : '#FF5252',
                    shape: 'arrowDown',
                    text: `SELL (${profit > 0 ? '+' : ''}${Math.round(profit)})`,
                    size: 2
                });
            }
        }
    }

    // 最終ポジション評価
    if (position !== null && data.length > 0) {
        const lastPrice = data[data.length - 1].close;
        const executionPrice = lastPrice * (1 - slippageRate);
        const grossValue = position.amount * executionPrice;
        const commission = grossValue * commissionRate;
        totalCommission += commission;
        balance = grossValue - commission;
    }

    const profit = balance - initialBalance;

    return {
        initialBalance,
        finalBalance: Math.round(balance),
        profit: Math.round(profit),
        profitPercent: parseFloat(((profit / initialBalance) * 100).toFixed(2)),
        trades: tradeCount,
        winRate: tradeCount > 0 ? Math.round((winCount / tradeCount) * 100) : 0,
        markers,
        totalCommission: Math.round(totalCommission),
    };
};

/**
 * デフォルト設定でのバックテスト
 * @param data - 株価データ
 * @param initialBalance - 初期資金（デフォルト: 10000）
 * @returns バックテスト結果
 */
export const runBacktest = (
    data: StockDataPoint[],
    initialBalance: number = 10000
): BacktestResult => {
    if (data.length < 50) return createEmptyResult(initialBalance);

    const aiSignals = calculateHistoricalSignals(data);
    return runSimulation(data, aiSignals, { buyThreshold: 75, sellThreshold: 40 }, initialBalance);
};

/**
 * 最適戦略探索機能 (Regime-Aware Auto-Tuning)
 * @param data - 株価データ
 * @param regime - 市場環境
 * @param initialBalance - 初期資金
 * @returns 最適化結果
 */
export const findOptimalStrategy = (
    data: StockDataPoint[],
    regime: MarketRegime = 'SIDEWAYS',
    initialBalance: number = 10000
): OptimizationResult => {
    if (data.length < 50) {
        return {
            params: { buyThreshold: 75, sellThreshold: 40 },
            result: createEmptyResult(initialBalance)
        };
    }

    const aiSignals = calculateHistoricalSignals(data);

    // Regimeに応じた探索範囲の定義
    let buyThresholds: number[];
    let sellThresholds: number[];

    switch (regime) {
        case 'BULL_TREND':
        case 'SQUEEZE':
            buyThresholds = [55, 60, 65, 70, 75, 80, 85];
            sellThresholds = [20, 30, 40, 50];
            break;

        case 'VOLATILE':
        case 'BEAR_TREND':
            buyThresholds = [80, 85, 90, 95];
            sellThresholds = [40, 50, 60, 70];
            break;

        case 'SIDEWAYS':
        default:
            buyThresholds = [65, 70, 75, 80, 85];
            sellThresholds = [30, 40, 50, 60];
            break;
    }

    let bestResult: BacktestResult | null = null;
    let bestParams: BacktestParams = { buyThreshold: 75, sellThreshold: 40 };

    // グリッドサーチ実行
    for (const buy of buyThresholds) {
        for (const sell of sellThresholds) {
            if (buy < sell + 10) continue;

            const result = runSimulation(data, aiSignals, { buyThreshold: buy, sellThreshold: sell }, initialBalance);

            if (!bestResult || result.profit > bestResult.profit) {
                bestResult = result;
                bestParams = { buyThreshold: buy, sellThreshold: sell };
            } else if (result.profit === bestResult.profit && result.trades < bestResult.trades) {
                bestResult = result;
                bestParams = { buyThreshold: buy, sellThreshold: sell };
            }
        }
    }

    return {
        params: bestParams,
        result: bestResult || runSimulation(data, aiSignals, bestParams, initialBalance)
    };
};

/**
 * 空のバックテスト結果を作成
 * @param initialBalance - 初期資金
 * @returns 空のバックテスト結果
 */
const createEmptyResult = (initialBalance: number): BacktestResult => ({
    initialBalance,
    trades: 0,
    profit: 0,
    profitPercent: 0,
    winRate: 0,
    finalBalance: initialBalance,
    markers: [],
    totalCommission: 0,
});

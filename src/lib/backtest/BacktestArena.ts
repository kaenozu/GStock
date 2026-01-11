/**
 * BacktestArena - バックテスト実行エンジン
 * @description 最適化された O(N) バックテスト
 * @module lib/backtest/BacktestArena
 */

import { StockDataPoint, TradeType, TradeSentiment } from '@/types/market';
import { SMA, RSI, MACD, ADX, BollingerBands, ATR } from 'technicalindicators';
import type { MACDOutput } from 'technicalindicators/declarations/moving_averages/MACD';
import type { ADXOutput } from 'technicalindicators/declarations/directionalmovement/ADX';
import type { BollingerBandsOutput } from 'technicalindicators/declarations/volatility/BollingerBands';

export interface BacktestReport {
    symbol: string;
    period: string;
    totalDays: number;
    initialBalance: number;
    finalBalance: number;
    profit: number;
    profitPercent: number;
    tradeCount: number;
    winRate: number;
    maxDrawdown: number;
    trades: SimulatedTrade[];
    equityCurve: { time: string, value: number }[];
}

interface SimulatedTrade {
    entryDate: string;
    entryPrice: number;
    exitDate?: string;
    exitPrice?: number;
    type: TradeType;
    quantity: number;
    pnl: number;
    reason: string;
}

/** 事前計算されたインジケーター */
interface PrecomputedIndicators {
    sma20: number[];
    sma50: number[];
    rsi: number[];
    macd: MACDOutput[];
    adx: ADXOutput[];
    bb: BollingerBandsOutput[];
    atr: number[];
}

/** 単一時点の分析結果 */
interface PointAnalysis {
    sentiment: TradeSentiment;
    confidence: number;
}

export class BacktestArena {
    /**
     * インジケーターを事前計算（O(N)）
     */
    private precomputeIndicators(history: StockDataPoint[]): PrecomputedIndicators {
        const closingPrices = history.map(d => d.close);
        const highPrices = history.map(d => d.high);
        const lowPrices = history.map(d => d.low);

        return {
            sma20: SMA.calculate({ period: 20, values: closingPrices }),
            sma50: SMA.calculate({ period: 50, values: closingPrices }),
            rsi: RSI.calculate({ period: 14, values: closingPrices }),
            macd: MACD.calculate({
                values: closingPrices,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false
            }),
            adx: ADX.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 }),
            bb: BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 }),
            atr: ATR.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 })
        };
    }

    /**
     * 特定インデックスでの分析を取得（O(1)）
     */
    private getAnalysisAtIndex(
        dataIndex: number,
        price: number,
        indicators: PrecomputedIndicators
    ): PointAnalysis {
        // インデックスマッピング
        // SMA20: データインデックス - 19 = SMAインデックス
        // SMA50: データインデックス - 49 = SMAインデックス
        const sma20Idx = dataIndex - 19;
        const sma50Idx = dataIndex - 49;
        const rsiIdx = dataIndex - 14;
        const macdIdx = dataIndex - 25; // slowPeriod(26) - 1
        const adxIdx = dataIndex - 14;
        const bbIdx = dataIndex - 19;
        const atrIdx = dataIndex - 14;

        // インデックス範囲チェック
        if (sma50Idx < 0 || macdIdx < 0 || rsiIdx < 0 || adxIdx < 0 || bbIdx < 0 || atrIdx < 0) {
            return { sentiment: 'NEUTRAL', confidence: 50 };
        }

        const sma20 = indicators.sma20[sma20Idx];
        const sma50 = indicators.sma50[sma50Idx];
        const rsi = indicators.rsi[rsiIdx];
        const macd = indicators.macd[macdIdx];
        const prevMacd = macdIdx > 0 ? indicators.macd[macdIdx - 1] : undefined;
        const adx = indicators.adx[adxIdx];
        const bb = indicators.bb[bbIdx];
        const atr = indicators.atr[atrIdx];

        if (!sma20 || !sma50 || !macd || !adx || !bb) {
            return { sentiment: 'NEUTRAL', confidence: 50 };
        }

        // スコア計算（簡略化版）
        let bullScore = 0;
        let bearScore = 0;

        const adxValue = adx.adx;
        const trendStrength = Math.min(Math.max(adxValue / 20, 0.5), 2.0);
        const oscillatorStrength = Math.min(Math.max(25 / adxValue, 0.5), 2.0);

        // トレンド分析
        if (price > sma20) bullScore += 15 * trendStrength;
        else bearScore += 15 * trendStrength;

        if (sma20 > sma50) bullScore += 15 * trendStrength;
        else bearScore += 15 * trendStrength;

        // RSI分析
        if (rsi > 50) bullScore += 10 * oscillatorStrength;
        else bearScore += 10 * oscillatorStrength;

        if (rsi < 30) bullScore += 25 * oscillatorStrength;
        else if (rsi > 70) bearScore += 25 * oscillatorStrength;

        // MACD分析
        const currentHist = macd.histogram || 0;
        const prevHist = prevMacd?.histogram || 0;
        const isHistGrowing = Math.abs(currentHist) > Math.abs(prevHist);

        if (macd.MACD && macd.signal && macd.MACD > macd.signal) {
            let score = 15;
            if (currentHist > 0 && isHistGrowing) score += 5;
            bullScore += score * trendStrength;
        } else {
            let score = 15;
            if (currentHist < 0 && isHistGrowing) score += 5;
            bearScore += score * trendStrength;
        }

        // ボリンジャーバンド
        if (price > bb.upper) {
            if (adxValue > 30) bullScore += 10;
            else bearScore += 20 * oscillatorStrength;
        } else if (price < bb.lower) {
            if (adxValue > 30) bearScore += 10;
            else bullScore += 20 * oscillatorStrength;
        }

        const finalScore = bullScore - bearScore;
        const isTrending = adxValue > 25;
        const atrPercent = (atr / price) * 100;
        const isHighVolatility = atrPercent > 3.0;

        let rawConfidence = (Math.abs(finalScore) / 35) * 100;
        if (isTrending) rawConfidence *= 1.3;
        else rawConfidence *= 0.85;
        if (isHighVolatility) rawConfidence *= 0.8;
        rawConfidence += 20;

        const confidence = Math.min(Math.round(rawConfidence), 98);
        const sentiment: TradeSentiment = finalScore >= 0 ? 'BULLISH' : 'BEARISH';

        return { confidence, sentiment };
    }

    /**
     * バックテストを実行（最適化済み O(N)）
     */
    public run(symbol: string, history: StockDataPoint[], initialBalance: number = 1000000): BacktestReport {
        // インジケーターを事前計算（一度だけ）
        const indicators = this.precomputeIndicators(history);

        let cash = initialBalance;
        let position: { quantity: number, entryPrice: number, type: TradeType } | null = null;
        const simulatedTrades: SimulatedTrade[] = [];
        const equityCurve: { time: string, value: number }[] = [];

        let peakEquity = initialBalance;
        let maxDrawdown = 0;

        const START_INDEX = 50;
        const BUY_THRESHOLD = 70;

        for (let i = START_INDEX; i < history.length; i++) {
            const currentDay = history[i];
            const price = currentDay.close;
            const date = currentDay.time;

            // 事前計算済みインジケーターから分析取得（O(1)）
            const analysis = this.getAnalysisAtIndex(i, price, indicators);

            // 現在の資産評価
            let currentEquity = cash;
            if (position) {
                currentEquity += (price - position.entryPrice) * position.quantity * (position.type === 'BUY' ? 1 : -1);
            }

            // ドローダウン更新
            if (currentEquity > peakEquity) peakEquity = currentEquity;
            const drawdown = (peakEquity - currentEquity) / peakEquity;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;

            equityCurve.push({ time: date, value: currentEquity });

            // 取引ロジック
            if (position) {
                let shouldExit = false;
                let reason = "";

                const pnlPercent = (price - position.entryPrice) / position.entryPrice * (position.type === 'BUY' ? 1 : -1);

                if (pnlPercent < -0.05) {
                    shouldExit = true;
                    reason = "ストップロス (-5%)";
                } else if (pnlPercent > 0.10) {
                    shouldExit = true;
                    reason = "利確定 (+10%)";
                } else if (analysis.sentiment === 'BEARISH' && position.type === 'BUY') {
                    shouldExit = true;
                    reason = "シグナル反転 (弱気)";
                }

                if (shouldExit) {
                    const pnl = (price - position.entryPrice) * position.quantity;
                    cash += (price * position.quantity);

                    simulatedTrades.push({
                        entryDate: simulatedTrades.find(t => !t.exitDate)?.entryDate || date,
                        entryPrice: position.entryPrice,
                        exitDate: date,
                        exitPrice: price,
                        type: position.type,
                        quantity: position.quantity,
                        pnl: pnl,
                        reason: reason
                    });
                    position = null;
                }
            } else {
                if (analysis.sentiment === 'BULLISH' && analysis.confidence >= BUY_THRESHOLD) {
                    const riskAmount = currentEquity * 0.2;
                    const quantity = Math.floor(riskAmount / price);

                    if (quantity > 0) {
                        cash -= (price * quantity);
                        position = {
                            quantity,
                            entryPrice: price,
                            type: 'BUY'
                        };
                        simulatedTrades.push({
                            entryDate: date,
                            entryPrice: price,
                            type: 'BUY',
                            quantity,
                            pnl: 0,
                            reason: `AIシグナル ${analysis.confidence}%`
                        });
                    }
                }
            }
        }

        // 終了時にポジションをクローズ
        if (position) {
            const lastPrice = history[history.length - 1].close;
            const pnl = (lastPrice - position.entryPrice) * position.quantity;
            cash += lastPrice * position.quantity;

            const lastTrade = simulatedTrades[simulatedTrades.length - 1];
            if (lastTrade) {
                lastTrade.exitDate = history[history.length - 1].time;
                lastTrade.exitPrice = lastPrice;
                lastTrade.pnl = pnl;
                lastTrade.reason = "バックテスト終了";
            }
        }

        const finalBalance = cash;
        const profit = finalBalance - initialBalance;
        const profitPercent = (profit / initialBalance) * 100;
        const completedTrades = simulatedTrades.filter(t => t.exitDate);
        const wins = completedTrades.filter(t => t.pnl > 0).length;
        const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0;

        return {
            symbol,
            period: `${history.length}日間`,
            totalDays: history.length,
            initialBalance,
            finalBalance,
            profit,
            profitPercent,
            tradeCount: completedTrades.length,
            winRate,
            maxDrawdown,
            trades: completedTrades,
            equityCurve
        };
    }
}

/**
 * Prediction Engine - G-Engine Prime
 * @description AIエージェント評議会による市場予測エンジン
 * @module lib/api/prediction-engine
 * 
 * ## アーキテクチャ
 * 
 * 1. **テクニカル分析層** (calculateScore)
 *    - SMA, RSI, MACD, ADX, BB, ATRを使用
 *    - Market Regime (市場環境) を判定
 * 
 * 2. **エージェント層** (Council)
 *    - ChairmanAgent: 総合判断
 *    - TrendAgent: トレンドフォロー
 *    - ReversalAgent: 逆張り
 *    - VolatilityAgent: ボラティリティブレイクアウト
 * 
 * 3. **コンセンサス層** (Consensus Engine)
 *    - 各エージェントの投票を重み付け平均
 *    - 最終的なシグナルを出力
 */

import { SMA, RSI, MACD, ADX, BollingerBands, ATR } from 'technicalindicators';
import type { MACDOutput } from 'technicalindicators/declarations/moving_averages/MACD';
import type { ADXOutput } from 'technicalindicators/declarations/directionalmovement/ADX';
import type { BollingerBandsOutput } from 'technicalindicators/declarations/volatility/BollingerBands';
import { StockDataPoint, AnalysisResult, TradeSentiment, ChartIndicators, MarketRegime } from '@/types/market';
import { ChairmanAgent } from '@/lib/agents/ChairmanAgent';
import { TrendAgent } from '@/lib/agents/TrendAgent';
import { ReversalAgent } from '@/lib/agents/ReversalAgent';
import { VolatilityAgent } from '@/lib/agents/VolatilityAgent';

/** スコア計算結果 */
interface ScoreResult {
    /** 信頼度 (0-100) */
    confidence: number;
    /** センチメント */
    sentiment: 'BULLISH' | 'BEARISH';
    /** 検出されたシグナル */
    signals: string[];
    /** 最終スコア */
    finalScore: number;
    /** 市場環境 */
    regime: MarketRegime;
}

/**
 * 内部用: 単一時点の指標値からスコアとシグナルを算出
 * 
 * @param price - 現在価格
 * @param sma20 - 20日移動平均
 * @param sma50 - 50日移動平均
 * @param rsi - RSI値
 * @param macd - MACD出力
 * @param prevMacd - 前日のMACD出力
 * @param adx - ADX出力
 * @param bb - ボリンジャーバンド出力
 * @param atr - ATR値
 * @returns スコア計算結果
 */
const calculateScore = (
    price: number,
    sma20: number,
    sma50: number,
    rsi: number,
    macd: MACDOutput,
    prevMacd: MACDOutput | undefined,
    adx: ADXOutput,
    bb: BollingerBandsOutput,
    atr: number
): ScoreResult => {

    let bullScore = 0;
    let bearScore = 0;
    const signals: string[] = [];

    // 環境認識: ADXによるトレンド強度の判定
    const adxValue = adx.adx;
    // トレンド相場度合い (0.5 ~ 2.0)
    const trendStrength = Math.min(Math.max(adxValue / 20, 0.5), 2.0);
    // レンジ相場度合い (トレンドが強いほど下がる)
    const oscillatorStrength = Math.min(Math.max(25 / adxValue, 0.5), 2.0);
    // トレンドが発生しているかのフラグ
    const isTrending = adxValue > 25;

    // ATRによるボラティリティリスク判定
    const atrPercent = (atr / price) * 100;
    const isHighVolatility = atrPercent > 3.0;

    // D. ボリンジャーバンド [逆張り/ボラティリティ]
    const bandWidth = (bb.upper - bb.lower) / sma20;
    const isSqueeze = bandWidth < 0.05;

    // --- Market Regime判定 ---
    let regime: MarketRegime = 'SIDEWAYS';
    if (isSqueeze) {
        regime = 'SQUEEZE';
    } else if (isHighVolatility) {
        regime = 'VOLATILE';
        signals.push(`高ボラティリティ(ATR:${atrPercent.toFixed(1)}%)`);
    } else if (isTrending) {
        if (price > sma20 && sma20 > sma50) {
            regime = 'BULL_TREND';
        } else if (price < sma20 && sma20 < sma50) {
            regime = 'BEAR_TREND';
        }
    }

    // Signalsに追加
    if (regime === 'SQUEEZE') signals.push("BBスクイーズ(爆発前夜)");
    if (regime === 'BULL_TREND') signals.push("明確な上昇トレンド");
    if (regime === 'BEAR_TREND') signals.push("明確な下落トレンド");

    // A. トレンド分析 (SMA) [順張り]
    if (price > sma20) {
        bullScore += 15 * trendStrength;
    } else {
        bearScore += 15 * trendStrength;
    }

    if (sma20 > sma50) {
        bullScore += 15 * trendStrength;
    } else {
        bearScore += 15 * trendStrength;
    }

    // B. モメンタム分析 (RSI) [逆張り/過熱感]
    if (rsi > 50) {
        bullScore += 10 * oscillatorStrength;
    } else {
        bearScore += 10 * oscillatorStrength;
    }

    if (rsi < 30) {
        bullScore += 25 * oscillatorStrength;
        signals.push(`RSI売られすぎ(${Math.round(rsi)})`);
    } else if (rsi > 70) {
        bearScore += 25 * oscillatorStrength;
        signals.push(`RSI買われすぎ(${Math.round(rsi)})`);
    }

    // C. MACD分析 [順張り/モメンタム加速]
    const currentHist = macd.histogram || 0;
    const prevHist = prevMacd?.histogram || 0;
    const isHistGrowing = Math.abs(currentHist) > Math.abs(prevHist);

    if (macd.MACD && macd.signal && macd.MACD > macd.signal) {
        let score = 15;
        if (currentHist > 0 && isHistGrowing) {
            score += 5;
        }
        bullScore += score * trendStrength;
    } else {
        let score = 15;
        if (currentHist < 0 && isHistGrowing) {
            score += 5;
        }
        bearScore += score * trendStrength;
    }

    // D. ボリンジャーバンド [逆張り/ボラティリティ]


    if (price > bb.upper) {
        if (adxValue > 30) {
            bullScore += 10;
            signals.push("バンドウォーク(上昇)");
        } else {
            bearScore += 20 * oscillatorStrength;
            signals.push("BB上限到達");
        }
    } else if (price < bb.lower) {
        if (adxValue > 30) {
            bearScore += 10;
            signals.push("バンドウォーク(下落)");
        } else {
            bullScore += 20 * oscillatorStrength;
            signals.push("BB下限到達");
        }
    }

    // --- 3. 総合判定 ---

    const finalScore = bullScore - bearScore;

    // 信頼度の計算チューニング
    let rawConfidence = (Math.abs(finalScore) / 35) * 100;

    if (isTrending) {
        rawConfidence *= 1.3;
    } else {
        rawConfidence *= 0.85;
    }

    if (isHighVolatility) {
        rawConfidence *= 0.8;
    }

    rawConfidence += 20;

    const confidence = Math.min(Math.round(rawConfidence), 98);
    const sentiment: TradeSentiment = finalScore >= 0 ? 'BULLISH' : 'BEARISH';

    return { confidence, sentiment, signals, finalScore, regime };
};

/**
 * G-Engine Prime: 最新の市場予測を返す
 * 
 * @param data - 株価データ（最低50日分必要）
 * @returns 分析結果（データ不足時はデフォルト値）
 * 
 * @example
 * ```typescript
 * const analysis = calculateAdvancedPredictions(stockData);
 * console.log(analysis.sentiment); // 'BULLISH' | 'BEARISH' | 'NEUTRAL'
 * console.log(analysis.confidence); // 0-100
 * ```
 */
export const calculateAdvancedPredictions = (data: StockDataPoint[]): AnalysisResult => {
    if (data.length < 50) return {
        predictions: [],
        confidence: 0,
        sentiment: 'NEUTRAL',
        marketRegime: 'SIDEWAYS',
        signals: [],
        stats: { rsi: 0, trend: 'NEUTRAL', adx: 0, price: 0, regime: 'SIDEWAYS' }
    };

    const closingPrices = data.map((d) => d.close);
    const highPrices = data.map(d => d.high);
    const lowPrices = data.map(d => d.low);

    const sma20 = SMA.calculate({ period: 20, values: closingPrices });
    const sma50 = SMA.calculate({ period: 50, values: closingPrices });
    const rsi = RSI.calculate({ period: 14, values: closingPrices });
    const macd = MACD.calculate({ values: closingPrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    const adx = ADX.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 });
    const bb = BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 });
    const atr = ATR.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 });

    const lastPrice = closingPrices[closingPrices.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastADX = adx[adx.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const lastSMA50 = sma50[sma50.length - 1];
    const lastBB = bb[bb.length - 1];
    const lastATR = atr[atr.length - 1];
    const prevMACD = macd[macd.length - 2];

    // --- Refactor: Use ChairmanAgent ---
    const chairman = new ChairmanAgent();
    const trendAgent = new TrendAgent();
    const reversalAgent = new ReversalAgent();
    const volatilityAgent = new VolatilityAgent();

    // Calculate Regime First
    const legacyResult = calculateScore(
        lastPrice, lastSMA20, lastSMA50, lastRSI, lastMACD, prevMACD, lastADX, lastBB, lastATR
    );
    const regime = legacyResult.regime;

    // Agent Analysis (The Council Votes)
    const chairmanResult = chairman.analyze(data, regime);
    const trendResult = trendAgent.analyze(data, regime);
    const reversalResult = reversalAgent.analyze(data, regime);
    const volResult = volatilityAgent.analyze(data, regime);

    // --- Consensus Engine (Phase 7.3) ---

    // Define Weights
    const weights = {
        'CHAIRMAN': 2.0,
        'VOLATILE': 1.5,
        'TREND': 1.0,
        'REVERSAL': 1.0
    };

    // Helper: Convert Agent Result to Numerical Score (-100 to 100)
    const getAgentScore = (res: { signal: 'BUY' | 'SELL' | 'HOLD'; confidence: number }): number => {
        let dir = 0;
        if (res.signal === 'BUY') dir = 1;
        else if (res.signal === 'SELL') dir = -1;
        return dir * res.confidence;
    };

    const results = [chairmanResult, volResult, trendResult, reversalResult];
    let totalScore = 0;
    let totalWeight = 0;
    const votes: string[] = [];

    results.forEach(res => {
        const weight = weights[res.role as keyof typeof weights] || 1.0;

        // Skip silent agents (HOLD with 0 confidence) from weighting? 
        // No, HOLD is a vote for Neutral (0). But if confidence is high and HOLD, it pulls towards 0.
        // Current agents return confidence 0 for neutral HOLD.
        // If an agent says BUY with 50 confidence, and another says HOLD 0 confidence (weight 1),
        // Score = (50*W1 + 0*W2) / (W1+W2). Correctly dilutes the signal.

        const score = getAgentScore(res);
        totalScore += score * weight;
        totalWeight += weight;

        // Log significant votes for display
        if (res.signal !== 'HOLD') {
            votes.push(`${res.name}: ${res.signal} (${res.reason})`);
        } else if (res.role === 'CHAIRMAN') {
            // Always hear the Chairman
            votes.push(`${res.name}: ${res.reason}`);
        }
    });

    const consensusScore = totalWeight > 0 ? totalScore / totalWeight : 0; // -100 to 100

    // Final Consensus Derivation
    const finalConfidence = Math.min(Math.abs(consensusScore), 100);
    let finalSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (consensusScore >= 20) finalSentiment = 'BULLISH';
    else if (consensusScore <= -20) finalSentiment = 'BEARISH';

    // Construct Signals
    const signals = legacyResult.signals; // Tech signals

    // 1. Add Consensus Summary
    const consensusSignal = `Council Consensus: ${finalSentiment} (Score: ${Math.round(consensusScore)})`;
    signals.unshift(consensusSignal);

    // 2. Add Detailed Votes (Top 3)
    votes.slice(0, 3).forEach(v => signals.push(v));

    // Map Consensus to Visualization
    const confidence = Math.round(finalConfidence);
    const sentiment = finalSentiment === 'NEUTRAL' ? 'NEUTRAL' : finalSentiment as TradeSentiment;

    // ... Predictions loop ...
    const predictions = [];
    const lastDate = new Date(data[data.length - 1].time);
    predictions.push({ time: data[data.length - 1].time, value: lastPrice });

    for (let i = 1; i <= 14; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        if (nextDate.getDay() === 0 || nextDate.getDay() === 6) continue;
        const dateStr = nextDate.toISOString().split('T')[0];

        const volatilityFactor = lastATR * 0.5;
        // Map sentiment to direction
        const directionFactor = sentiment === 'BULLISH' ? 0.3 : sentiment === 'BEARISH' ? -0.3 : 0;

        // Adjust direction intensity based on Consensus Score strength
        const intensity = Math.abs(consensusScore) / 100;

        const noise = (Math.random() - 0.5) * (lastATR * 0.2);
        const change = (directionFactor * intensity * volatilityFactor * i) + noise;

        predictions.push({
            time: dateStr,
            value: parseFloat((lastPrice + change).toFixed(2))
        });
    }

    const chartIndicators: ChartIndicators = {
        sma20: sma20.map((val, i) => ({ time: data[i + 19].time, value: val })),
        sma50: sma50.map((val, i) => ({ time: data[i + 49].time, value: val })),
        upperBand: bb.map((val, i) => ({ time: data[i + 19].time, value: val.upper })),
        lowerBand: bb.map((val, i) => ({ time: data[i + 19].time, value: val.lower }))
    };

    return {
        predictions,
        confidence,
        sentiment,
        signals,
        stats: {
            rsi: Math.round(lastRSI),
            trend: lastSMA20 > lastSMA50 ? 'UP' : 'DOWN',
            adx: Math.round(lastADX.adx),
            price: lastPrice,
            regime: regime
        },
        marketRegime: regime,
        chartIndicators
    };
};

/** 履歴シグナルの型 */
export interface HistoricalSignal {
    time: string;
    price: number;
    confidence: number;
    sentiment: 'BULLISH' | 'BEARISH';
    signals: string[];
}

/**
 * バックテスト用: 全期間のAI判断履歴を生成
 * 
 * @param data - 株価データ（最低50日分必要）
 * @returns 各日のシグナル配列（データ不足時は空配列）
 */
export const calculateHistoricalSignals = (data: StockDataPoint[]): HistoricalSignal[] => {
    if (data.length < 50) return [];

    const closingPrices = data.map((d) => d.close);
    const highPrices = data.map(d => d.high);
    const lowPrices = data.map(d => d.low);

    const sma20 = SMA.calculate({ period: 20, values: closingPrices });
    const sma50 = SMA.calculate({ period: 50, values: closingPrices });
    const rsi = RSI.calculate({ period: 14, values: closingPrices });
    const macd = MACD.calculate({ values: closingPrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    const adx = ADX.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 });
    const bb = BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 });
    const atr = ATR.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 });

    // インジケーター計算開始位置（最大期間の50日目から）
    const startIndex = 50;
    const results = [];

    for (let i = startIndex; i < data.length; i++) {
        // 各インジケーターの配列インデックス計算
        const sma20Idx = i - 20;
        const sma50Idx = i - 50;
        const rsiIdx = i - 14;
        const adxIdx = i - 14;
        const bbIdx = i - 20;
        const atrIdx = i - 14;
        const macdIdx = i - 26; // MACDはslowPeriod(26)依存

        // 全てのインジケーターが計算可能な範囲か確認
        if (sma50Idx < 0 || macdIdx < 0) continue;

        const currentPrice = closingPrices[i];

        try {
            const { confidence, sentiment, signals } = calculateScore(
                currentPrice,
                sma20[sma20Idx],
                sma50[sma50Idx],
                rsi[rsiIdx],
                macd[macdIdx],
                macd[macdIdx - 1], // prevMacd
                adx[adxIdx],
                bb[bbIdx],
                atr[atrIdx]
            );

            results.push({
                time: data[i].time,
                price: currentPrice,
                confidence,
                sentiment,
                signals
            });
        } catch {
            // 計算エラー時はスキップ
            continue;
        }
    }

    return results;
};
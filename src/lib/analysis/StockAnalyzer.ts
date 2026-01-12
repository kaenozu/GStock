/**
 * StockAnalyzer - 株式分析ロジックの集約
 * @description useScanningから分離した分析ロジック
 * @module lib/analysis/StockAnalyzer
 */

import { StockDataPoint, AnalysisResult, TradeSentiment, MarketRegime } from '@/types/market';

export interface AnalysisStats {
    sentiment: TradeSentiment;
    confidence: number;
    rsi: number;
    regime: MarketRegime;
    adx: number;
}

/**
 * 株式分析クラス
 * テクニカル指標の計算と市場分析を行う
 */
export class StockAnalyzer {
    /**
     * RSI（相対力指数）を計算
     * @param closes - 終値配列
     * @param period - 計算期間（デフォルト14）
     * @returns RSI値（0-100）
     */
    static calculateRSI(closes: number[], period = 14): number {
        if (closes.length < period + 1) return 50;

        const recentCloses = closes.slice(-(period + 1));
        let gains = 0;
        let losses = 0;

        for (let i = 1; i < recentCloses.length; i++) {
            const change = recentCloses[i] - recentCloses[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;

        return 100 - (100 / (1 + rs));
    }

    /**
     * ADX（平均方向性指数）を計算
     * ADX > 25: 強いトレンド, ADX < 20: 弱い/トレンドなし
     * @param history - 株価データ配列
     * @param period - 計算期間（デフォルト14）
     * @returns ADX値
     */
    static calculateADX(history: StockDataPoint[], period = 14): number {
        if (history.length < period + 1) return 20;

        const data = history.slice(-(period + 1));
        let sumDX = 0;

        for (let i = 1; i < data.length; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevHigh = data[i - 1].high;
            const prevLow = data[i - 1].low;
            const prevClose = data[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
            const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;

            if (tr > 0) {
                const plusDI = (plusDM / tr) * 100;
                const minusDI = (minusDM / tr) * 100;
                const diSum = plusDI + minusDI;
                if (diSum > 0) {
                    sumDX += (Math.abs(plusDI - minusDI) / diSum) * 100;
                }
            }
        }

        return sumDX / period;
    }

    /**
     * SMA（単純移動平均）を計算
     * @param values - 数値配列
     * @param period - 計算期間
     * @returns SMA値
     */
    static calculateSMA(values: number[], period: number): number {
        if (values.length < period) return values[values.length - 1] || 0;
        const slice = values.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / period;
    }

    /**
     * 株価データから総合分析を実行
     * @param history - 株価データ配列
     * @returns 分析統計
     */
    static analyze(history: StockDataPoint[]): AnalysisStats {
        if (history.length < 20) {
            return {
                sentiment: 'NEUTRAL',
                confidence: 50,
                rsi: 50,
                regime: 'SIDEWAYS',
                adx: 20
            };
        }

        const closes = history.map(d => d.close);
        const rsi = this.calculateRSI(closes);
        const adx = this.calculateADX(history);

        const isStrongTrend = adx > 25;
        const isWeakTrend = adx < 20;

        // 短期トレンド計算（SMA5 vs SMA20）
        const sma5 = this.calculateSMA(closes, 5);
        const sma20 = this.calculateSMA(closes, 20);
        const trendStrength = ((sma5 - sma20) / sma20) * 100;
        const isBullishTrend = sma5 > sma20;

        // ADXを考慮したセンチメント判定
        let sentiment: TradeSentiment = 'NEUTRAL';
        let confidence = 50;

        if (isStrongTrend) {
            // 強いトレンド: トレンドに従う
            if (isBullishTrend) {
                sentiment = 'BULLISH';
                confidence = Math.min(85, 60 + (rsi - 50) * 0.5 + (adx - 25) * 0.5);
            } else {
                sentiment = 'BEARISH';
                confidence = Math.min(85, 60 + (50 - rsi) * 0.5 + (adx - 25) * 0.5);
            }
        } else if (isWeakTrend) {
            // 弱いトレンド: RSI極値が信頼できる
            if (rsi > 70) {
                sentiment = 'BEARISH';
                confidence = Math.min(80, 55 + (rsi - 70) * 1.5);
            } else if (rsi < 30) {
                sentiment = 'BULLISH';
                confidence = Math.min(80, 55 + (30 - rsi) * 1.5);
            }
        } else {
            // 中程度のトレンド: バランスアプローチ
            if (rsi > 70 && !isBullishTrend) {
                sentiment = 'BEARISH';
                confidence = Math.min(75, 50 + (rsi - 70));
            } else if (rsi < 30 && isBullishTrend) {
                sentiment = 'BULLISH';
                confidence = Math.min(75, 50 + (30 - rsi));
            } else if (trendStrength > 2) {
                sentiment = 'BULLISH';
                confidence = Math.min(70, 50 + trendStrength * 3);
            } else if (trendStrength < -2) {
                sentiment = 'BEARISH';
                confidence = Math.min(70, 50 + Math.abs(trendStrength) * 3);
            }
        }

        // 市場環境（Regime）判定
        let regime: MarketRegime = 'SIDEWAYS';
        if (isStrongTrend && isBullishTrend) regime = 'BULL_TREND';
        else if (isStrongTrend && !isBullishTrend) regime = 'BEAR_TREND';
        else if (adx > 30 && Math.abs(trendStrength) > 3) regime = 'VOLATILE';

        return {
            sentiment,
            confidence: Math.round(confidence),
            rsi: Math.round(rsi),
            regime,
            adx: Math.round(adx)
        };
    }

    /**
     * 完全な分析結果を生成（APIレスポンス用）
     * @param symbol - 銘柄シンボル
     * @param history - 株価データ配列
     * @returns 完全な分析結果
     */
    static createAnalysisResult(symbol: string, history: StockDataPoint[]): AnalysisResult {
        const stats = this.analyze(history);
        const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;

        return {
            symbol,
            history,
            predictions: [],
            sentiment: stats.sentiment,
            confidence: stats.confidence,
            marketRegime: stats.regime,
            signals: [],
            stats: {
                price: lastPrice,
                rsi: stats.rsi,
                trend: stats.sentiment === 'BULLISH' ? 'UP' : stats.sentiment === 'BEARISH' ? 'DOWN' : 'NEUTRAL',
                adx: stats.adx,
                regime: stats.regime
            }
        };
    }
}

export default StockAnalyzer;

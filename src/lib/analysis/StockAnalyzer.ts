/**
 * StockAnalyzer - 株式分析ロジックの集約
 * @description useScanningから分離した分析ロジック
 * @module lib/analysis/StockAnalyzer
 */

import { StockDataPoint, AnalysisResult, TradeSentiment, MarketRegime } from '@/types/market';
import { calculateRSI, calculateADX, calculateSMA, calculateAnalysis } from './technical';

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
 * @deprecated Use functional approach in lib/analysis/technical.ts
 */
export class StockAnalyzer {
    /**
     * RSI（相対力指数）を計算
     */
    static calculateRSI(closes: number[], period = 14): number {
        return calculateRSI(closes, period);
    }

    /**
     * ADX（平均方向性指数）を計算
     */
    static calculateADX(history: StockDataPoint[], period = 14): number {
        return calculateADX(history, period);
    }

    /**
     * SMA（単純移動平均）を計算
     */
    static calculateSMA(values: number[], period: number): number {
        return calculateSMA(values, period);
    }

    /**
     * 株価データから総合分析を実行
     */
    static analyze(history: StockDataPoint[]): AnalysisStats {
        return calculateAnalysis(history);
    }

    /**
     * 完全な分析結果を生成（APIレスポンス用）
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


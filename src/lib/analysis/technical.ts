
import { StockDataPoint, TradeSentiment, MarketRegime } from '@/types/market';

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1] || 0;
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Calculate RSI (Relative Strength Index)
 * @returns RSI value (0-100)
 */
export function calculateRSI(closes: number[], period: number = 14): number {
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
 * Calculate ADX (Average Directional Index) for trend strength
 * ADX > 25: Strong trend, ADX < 20: Weak/No trend
 */
export function calculateADX(history: StockDataPoint[], period: number = 14): number {
    if (history.length < period + 1) return 20; // Default neutral

    const data = history.slice(-(period + 1));
    let sumDX = 0;

    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevHigh = data[i - 1].high;
        const prevLow = data[i - 1].low;
        const prevClose = data[i - 1].close;

        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
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
 * Calculate RSI, ADX and derive sentiment from stock data
 * Improved: Uses ADX to determine if RSI signals are reliable
 */
export function calculateAnalysis(history: StockDataPoint[]): {
    sentiment: TradeSentiment;
    confidence: number;
    rsi: number;
    regime: MarketRegime;
    adx: number;
} {
    if (history.length < 20) {
        return { sentiment: 'NEUTRAL', confidence: 50, rsi: 50, regime: 'SIDEWAYS', adx: 20 };
    }

    const closes = history.map(d => d.close);

    // Calculate RSI
    const rsi = calculateRSI(closes);

    // Calculate ADX for trend strength
    const adx = calculateADX(history);
    const isStrongTrend = adx > 25;
    const isWeakTrend = adx < 20;

    // Calculate short-term trend (SMA5 vs SMA20)
    const sma5 = calculateSMA(closes, 5);
    const sma20 = calculateSMA(closes, 20);
    const trendStrength = ((sma5 - sma20) / sma20) * 100;
    const isBullishTrend = sma5 > sma20;

    // Determine sentiment with ADX-aware logic
    let sentiment: TradeSentiment = 'NEUTRAL';
    let confidence = 50;

    // Strong trend: Follow the trend, ignore overbought/oversold
    if (isStrongTrend) {
        if (isBullishTrend) {
            sentiment = 'BULLISH';
            // RSI > 50 in uptrend = momentum confirmation
            confidence = Math.min(85, 60 + (rsi - 50) * 0.5 + (adx - 25) * 0.5);
        } else {
            sentiment = 'BEARISH';
            confidence = Math.min(85, 60 + (50 - rsi) * 0.5 + (adx - 25) * 0.5);
        }
    }
    // Weak trend: RSI extremes are more reliable for reversals
    else if (isWeakTrend) {
        if (rsi > 70) {
            sentiment = 'BEARISH';
            confidence = Math.min(80, 55 + (rsi - 70) * 1.5);
        } else if (rsi < 30) {
            sentiment = 'BULLISH';
            confidence = Math.min(80, 55 + (30 - rsi) * 1.5);
        }
    }
    // Medium trend: Balanced approach
    else {
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

    // Determine regime
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

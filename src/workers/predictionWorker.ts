import { StockDataPoint, AnalysisResult, MarketRegime } from '@/types/market';
import { SMA, RSI, MACD, ADX, BollingerBands, ATR } from 'technicalindicators';

self.onmessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    switch (type) {
        case 'CALCULATE_PREDICTIONS':
            const result = calculateAdvancedPredictions(data.stockData);
            self.postMessage({
                type: 'PREDICTIONS_COMPLETE',
                data: result
            });
            break;

        case 'CALCULATE_INDICATORS':
            const indicators = calculateTechnicalIndicators(data.stockData);
            self.postMessage({
                type: 'INDICATORS_COMPLETE',
                data: indicators
            });
            break;

        case 'CALCULATE_REGIME':
            const regime = detectMarketRegime(data.stockData);
            self.postMessage({
                type: 'REGIME_COMPLETE',
                data: regime
            });
            break;

        default:
            console.warn('[PredictionWorker] Unknown message type:', type);
    }
};

function calculateAdvancedPredictions(stockData: StockDataPoint[]): AnalysisResult {
    if (stockData.length < 50) {
        return {
            predictions: [],
            confidence: 0,
            sentiment: 'NEUTRAL',
            marketRegime: 'SIDEWAYS',
            signals: ['データ不足'],
            stats: { rsi: 0, trend: 'NEUTRAL', adx: 0, price: 0, regime: 'SIDEWAYS' }
        };
    }

    const closingPrices = stockData.map((d) => d.close);
    const highPrices = stockData.map(d => d.high);
    const lowPrices = stockData.map(d => d.low);

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

    let score = 0;
    const signals: string[] = [];

    const adxValue = lastADX.adx;
    const isTrending = adxValue > 25;
    const trendStrength = Math.min(Math.max(adxValue / 20, 0.5), 2.0);
    const oscillatorStrength = Math.min(Math.max(25 / adxValue, 0.5), 2.0);

    if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50) {
        score += 15 * trendStrength;
        signals.push('上昇トレンド');
    } else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50) {
        score -= 15 * trendStrength;
        signals.push('下落トレンド');
    }

    if (lastRSI < 30) {
        score += 25 * oscillatorStrength;
        signals.push(`RSI売られすぎ (${Math.round(lastRSI)})`);
    } else if (lastRSI > 70) {
        score -= 25 * oscillatorStrength;
        signals.push(`RSI買われすぎ (${Math.round(lastRSI)})`);
    }

    const currentHist = lastMACD.histogram || 0;
    const prevMACD = macd[macd.length - 2];
    const prevHist = prevMACD?.histogram || 0;
    const isHistGrowing = Math.abs(currentHist) > Math.abs(prevHist);

    if (lastMACD.MACD && lastMACD.signal && lastMACD.MACD > lastMACD.signal) {
        let macdScore = 15;
        if (currentHist > 0 && isHistGrowing) {
            macdScore += 5;
            signals.push('MACD上昇モーメンタム');
        }
        score += macdScore * trendStrength;
    } else {
        let macdScore = 15;
        if (currentHist < 0 && isHistGrowing) {
            macdScore += 5;
        }
        score -= macdScore * trendStrength;
    }

    if (lastPrice > lastBB.upper) {
        if (adxValue > 30) {
            score += 10;
            signals.push('バンドウォーク（上昇）');
        } else {
            score -= 20 * oscillatorStrength;
            signals.push('BB上限到達');
        }
    } else if (lastPrice < lastBB.lower) {
        if (adxValue > 30) {
            score -= 10;
            signals.push('バンドウォーク（下落）');
        } else {
            score += 20 * oscillatorStrength;
            signals.push('BB下限到達');
        }
    }

    const finalScore = score;
    let rawConfidence = (Math.abs(finalScore) / 35) * 100;

    if (isTrending) {
        rawConfidence *= 1.3;
    } else {
        rawConfidence *= 0.85;
    }

    const atrPercent = (lastATR / lastPrice) * 100;
    const isHighVolatility = atrPercent > 3.0;

    if (isHighVolatility) {
        rawConfidence *= 0.8;
        signals.push(`高ボラティリティ（ATR:${atrPercent.toFixed(1)}%）`);
    }

    rawConfidence += 20;

    const confidence = Math.min(Math.round(rawConfidence), 98);
    const sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = finalScore >= 0 ? 'BULLISH' : 'BEARISH';

    let regime: MarketRegime = 'SIDEWAYS';
    const bandWidth = (lastBB.upper - lastBB.lower) / lastSMA20;
    const isSqueeze = bandWidth < 0.05;

    if (isSqueeze) {
        regime = 'SQUEEZE';
        signals.push('BBスクイーズ（爆発前夜）');
    } else if (isHighVolatility) {
        regime = 'VOLATILE';
    } else if (isTrending) {
        if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50) {
            regime = 'BULL_TREND';
            signals.push('明確な上昇トレンド');
        } else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50) {
            regime = 'BEAR_TREND';
            signals.push('明確な下落トレンド');
        }
    }

    const predictions = [];
    const lastDate = new Date(stockData[stockData.length - 1].time);
    predictions.push({ time: stockData[stockData.length - 1].time, value: lastPrice });

    for (let i = 1; i <= 14; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        if (nextDate.getDay() === 0 || nextDate.getDay() === 6) continue;
        const dateStr = nextDate.toISOString().split('T')[0];

        const volatilityFactor = lastATR * 0.5;
        const directionFactor = sentiment === 'BULLISH' ? 0.3 : sentiment === 'BEARISH' ? -0.3 : 0;
        const intensity = Math.abs(finalScore) / 100;
        const noise = (Math.random() - 0.5) * (lastATR * 0.2);
        const change = (directionFactor * intensity * volatilityFactor * i) + noise;

        predictions.push({
            time: dateStr,
            value: parseFloat((lastPrice + change).toFixed(2))
        });
    }

    const chartIndicators = {
        sma20: sma20.map((val, i) => ({ time: stockData[i + 19].time, value: val })),
        sma50: sma50.map((val, i) => ({ time: stockData[i + 49].time, value: val })),
        upperBand: bb.map((val, i) => ({ time: stockData[i + 19].time, value: val.upper })),
        lowerBand: bb.map((val, i) => ({ time: stockData[i + 19].time, value: val.lower }))
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
            regime
        },
        marketRegime: regime,
        chartIndicators
    };
}

function calculateTechnicalIndicators(stockData: StockDataPoint[]) {
    const closingPrices = stockData.map((d) => d.close);
    const highPrices = stockData.map(d => d.high);
    const lowPrices = stockData.map(d => d.low);

    const sma20 = SMA.calculate({ period: 20, values: closingPrices });
    const sma50 = SMA.calculate({ period: 50, values: closingPrices });
    const rsi = RSI.calculate({ period: 14, values: closingPrices });

    return {
        sma20,
        sma50,
        rsi,
        lastRSI: rsi[rsi.length - 1]
    };
}

function detectMarketRegime(stockData: StockDataPoint[]): MarketRegime {
    if (stockData.length < 50) return 'SIDEWAYS';

    const closingPrices = stockData.map((d) => d.close);
    const sma20 = SMA.calculate({ period: 20, values: closingPrices });
    const sma50 = SMA.calculate({ period: 50, values: closingPrices });

    const lastPrice = closingPrices[closingPrices.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const lastSMA50 = sma50[sma50.length - 1];

    if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50) {
        return 'BULL_TREND';
    } else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50) {
        return 'BEAR_TREND';
    }

    return 'SIDEWAYS';
}

export {};

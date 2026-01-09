import { SMA, RSI, MACD, ADX, BollingerBands, ATR } from 'technicalindicators';
import { StockDataPoint, AnalysisResult, TradeSentiment, ChartIndicators } from '@/types/market';

/**
 * 内部用: 単一時点の指標値からスコアとシグナルを算出する
 */
const calculateScore = (
    price: number,
    sma20: number,
    sma50: number,
    rsi: number,
    macd: any,
    prevMacd: any,
    adx: any,
    bb: any,
    atr: number
): { confidence: number, sentiment: 'BULLISH' | 'BEARISH', signals: string[], finalScore: number } => {
    
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
    const isTrending = trendStrength > 1.0;

    // ATRによるボラティリティリスク判定
    const atrPercent = (atr / price) * 100; 
    const isHighVolatility = atrPercent > 3.0;

    if (isHighVolatility) {
        signals.push(`高ボラティリティ(ATR:${atrPercent.toFixed(1)}%)`);
    }

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
    const bandWidth = (bb.upper - bb.lower) / sma20;
    const isSqueeze = bandWidth < 0.05; 

    if (isSqueeze) {
        signals.push("BBスクイーズ");
    }

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

    return { confidence, sentiment, signals, finalScore };
};

/**
 * G-Engine Prime: 最新の市場予測を返す
 */
export const calculateAdvancedPredictions = (data: StockDataPoint[]): AnalysisResult => {
    if (data.length < 50) return {
        predictions: [],
        confidence: 0,
        sentiment: 'NEUTRAL',
        signals: [],
        stats: { rsi: 0, trend: 'NEUTRAL', adx: 0, price: 0 }
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

    // スコア計算の分離呼び出し
    const { confidence, sentiment, signals, finalScore } = calculateScore(
        lastPrice, lastSMA20, lastSMA50, lastRSI, lastMACD, prevMACD, lastADX, lastBB, lastATR
    );

    // 未来予測パスの生成
    const predictions = [];
    const lastDate = new Date(data[data.length - 1].time);
    predictions.push({ time: data[data.length - 1].time, value: lastPrice });

    for (let i = 1; i <= 14; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        if (nextDate.getDay() === 0 || nextDate.getDay() === 6) continue;
        const dateStr = nextDate.toISOString().split('T')[0];
        
        const volatilityFactor = lastATR * 0.5; 
        const directionFactor = finalScore / 100;
        const noise = (Math.random() - 0.5) * (lastATR * 0.2); 
        const change = (directionFactor * volatilityFactor * i) + noise;

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
            price: lastPrice
        },
        chartIndicators
    };
};

/**
 * バックテスト用: 全期間のAI判断履歴を生成する
 */
export const calculateHistoricalSignals = (data: StockDataPoint[]) => {
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
        } catch (e) {
            // 計算エラー時はスキップ
            continue;
        }
    }

    return results;
};
import { SMA, RSI, MACD, ADX, BollingerBands } from 'technicalindicators';
import { StockDataPoint, AnalysisResult, TradeSentiment, ChartIndicators } from '@/types/market';

/**
 * G-Engine Prime: アンサンブルテクニカル分析による高精度予測
 */
export const calculateAdvancedPredictions = (data: StockDataPoint[]): AnalysisResult => {
    if (data.length < 50) return {
        predictions: [],
        confidence: 0,
        sentiment: 'NEUTRAL',
        signals: [],
        stats: { rsi: 0, trend: 'NEUTRAL', adx: 0, price: 0 }
    };

    const prices = data.map((d) => d.close);
    const closingPrices = prices;

    // 1. トレンド分析 (Moving Averages)
    const sma20 = SMA.calculate({ period: 20, values: closingPrices });
    const sma50 = SMA.calculate({ period: 50, values: closingPrices });

    // 2. モメンタム分析 (RSI, MACD)
    const rsi = RSI.calculate({ period: 14, values: closingPrices });
    const macd = MACD.calculate({
        values: closingPrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });

    // 3. ボラティリティ & 強度分析 (ADX, Bollinger Bands)
    const adx = ADX.calculate({
        high: data.map(d => d.high),
        low: data.map(d => d.low),
        close: closingPrices,
        period: 14
    });

    const bb = BollingerBands.calculate({
        period: 20,
        values: closingPrices,
        stdDev: 2
    });

    const lastPrice = closingPrices[closingPrices.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastADX = adx[adx.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const lastSMA50 = sma50[sma50.length - 1];
    const lastBB = bb[bb.length - 1];

    let bullScore = 0;
    let bearScore = 0;
    const signals: string[] = [];

    // トレンド: 移動平均の並び (パーフェクトオーダー)
    if (lastPrice > lastSMA20) {
        bullScore += 15;
        signals.push("価格が短期移動平均(SMA20)の上方で推移");
    } else {
        bearScore += 15;
        signals.push("価格が短期移動平均(SMA20)を下回る弱気局面");
    }

    if (lastSMA20 > lastSMA50) {
        bullScore += 15;
        signals.push("移動平均線が上昇トレンドを形成(SMA20>50)");
    } else {
        bearScore += 15;
        signals.push("移動平均線が下降トレンドを形成(SMA20<50)");
    }

    // モメンタム: RSI
    if (lastRSI > 50) bullScore += 10; else bearScore += 10;
    if (lastRSI < 35) {
        bullScore += 20;
        signals.push("RSIが35%を割り込み、歴史的な売られすぎ水準に到達");
    }
    if (lastRSI > 65) {
        bearScore += 20;
        signals.push("RSIが65%を超え、短期的な過熱感がピークに達しています");
    }

    // MACD
    if (lastMACD.MACD && lastMACD.signal && lastMACD.MACD > lastMACD.signal) {
        bullScore += 15;
        signals.push("MACDがゴールデンクロスを維持し上昇の勢いを示唆");
    } else {
        bearScore += 15;
        signals.push("MACDがデッドクロスを維持し下落バイアスが継続");
    }

    // ボリンジャーバンド
    if (lastPrice > lastBB.upper) {
        bearScore += 10;
        signals.push("ボリンジャーバンドの上限を突破。反落のリスクが高まっています");
    }
    if (lastPrice < lastBB.lower) {
        bullScore += 10;
        signals.push("ボリンジャーバンドの下限を突破。強烈な反発の予兆です");
    }

    // ADXによるトレンド強度マルチプライヤー
    const isTrending = lastADX.adx > 25;
    if (isTrending) {
        signals.push(`ADXが${Math.round(lastADX.adx)}に到達。非常に強いトレンドが発生しています`);
    } else {
        signals.push("ADXが低く、現在は方向感のないレンジ相場と判断");
    }

    const finalScore = bullScore - bearScore;

    // 信頼度の計算 (0-100にスケーリング)
    let confidence = (Math.abs(finalScore) / 50) * 100;
    if (isTrending) confidence *= 1.2; else confidence *= 0.7; // トレンドがない時は慎重に

    confidence = Math.min(Math.round(confidence), 100);
    const sentiment: TradeSentiment = finalScore >= 0 ? 'BULLISH' : 'BEARISH';

    const predictions = [];
    const lastDate = new Date(data[data.length - 1].time);

    predictions.push({ time: data[data.length - 1].time, value: lastPrice });

    for (let i = 1; i <= 14; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        if (nextDate.getDay() === 0 || nextDate.getDay() === 6) continue;

        const dateStr = nextDate.toISOString().split('T')[0];

        // スコアに基づく価格推移（長期になるほど変動幅を抑制しつつトレンドを反映）
        const volatilityBase = lastPrice * 0.008; // 少し抑えめに調整 (1% -> 0.8%)
        const change = (finalScore / 100) * volatilityBase * i;

        predictions.push({
            time: dateStr,
            value: parseFloat((lastPrice + change).toFixed(2))
        });
    }

    // チャート表示用データの生成
    // technicalindicators の結果配列は、期間(period)分だけ元データより短い
    // data[0]...data[period-1] までは計算不能のため結果に含まれない
    // つまり、result[0] は data[period-1] に対応する

    const chartIndicators: ChartIndicators = {
        sma20: sma20.map((val, i) => ({ time: data[i + 19].time, value: val })),
        sma50: sma50.map((val, i) => ({ time: data[i + 49].time, value: val })),
        upperBand: bb.map((val, i) => ({ time: data[i + 19].time, value: val.upper })),
        lowerBand: bb.map((val, i) => ({ time: data[i + 19].time, value: val.lower }))
    };

    return {
        predictions,
        confidence: Math.round(confidence),
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

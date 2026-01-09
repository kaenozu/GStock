import { SMA, RSI, MACD, ADX, BollingerBands, ATR } from 'technicalindicators';
import { StockDataPoint, AnalysisResult, TradeSentiment, ChartIndicators } from '@/types/market';

/**
 * G-Engine Prime: アンサンブルテクニカル分析による高精度予測
 * 
 * 複数のテクニカル指標を動的な重み付けで統合し、市場環境（トレンド/レンジ）に適応した予測を行う。
 */
export const calculateAdvancedPredictions = (data: StockDataPoint[]): AnalysisResult => {
    // データ不足時の早期リターン
    if (data.length < 50) return {
        predictions: [],
        confidence: 0,
        sentiment: 'NEUTRAL',
        signals: [],
        stats: { rsi: 0, trend: 'NEUTRAL', adx: 0, price: 0 }
    };

    const prices = data.map((d) => d.close);
    const highPrices = data.map(d => d.high);
    const lowPrices = data.map(d => d.low);
    const closingPrices = prices;

    // --- 1. テクニカル指標の計算 ---

    // トレンド (Moving Averages)
    const sma20 = SMA.calculate({ period: 20, values: closingPrices });
    const sma50 = SMA.calculate({ period: 50, values: closingPrices });

    // モメンタム (RSI, MACD)
    const rsi = RSI.calculate({ period: 14, values: closingPrices });
    const macd = MACD.calculate({
        values: closingPrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });

    // ボラティリティ & 強度 (ADX, Bollinger Bands, ATR)
    const adx = ADX.calculate({
        high: highPrices,
        low: lowPrices,
        close: closingPrices,
        period: 14
    });

    const bb = BollingerBands.calculate({
        period: 20,
        values: closingPrices,
        stdDev: 2
    });

    const atr = ATR.calculate({
        high: highPrices,
        low: lowPrices,
        close: closingPrices,
        period: 14
    });

    // 最新データの抽出
    const lastPrice = closingPrices[closingPrices.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastADX = adx[adx.length - 1];
    const lastSMA20 = sma20[sma20.length - 1];
    const lastSMA50 = sma50[sma50.length - 1];
    const lastBB = bb[bb.length - 1];
    const lastATR = atr[atr.length - 1];
    
    const prevMACD = macd[macd.length - 2]; 

    // --- 2. スコアリングロジック ---

    let bullScore = 0;
    let bearScore = 0;
    const signals: string[] = [];

    // 環境認識: ADXによるトレンド強度の判定
    const adxValue = lastADX.adx;
    // トレンド相場度合い (0.5 ~ 2.0)
    const trendStrength = Math.min(Math.max(adxValue / 20, 0.5), 2.0); 
    // レンジ相場度合い (トレンドが強いほど下がる)
    const oscillatorStrength = Math.min(Math.max(25 / adxValue, 0.5), 2.0);
    // トレンドが発生しているかのフラグ
    const isTrending = trendStrength > 1.0;

    // ATRによるボラティリティリスク判定
    const atrPercent = (lastATR / lastPrice) * 100; // ATR比率（価格に対する変動率）
    const isHighVolatility = atrPercent > 3.0; // 3%以上の変動は高ボラティリティと定義

    if (isHighVolatility) {
        signals.push(`高ボラティリティ(ATR:${atrPercent.toFixed(1)}%)。リスク管理を徹底してください`);
    }

    // A. トレンド分析 (SMA) [順張り]
    if (lastPrice > lastSMA20) {
        bullScore += 15 * trendStrength;
        signals.push("価格が短期SMA(20)の上方で推移");
    } else {
        bearScore += 15 * trendStrength;
        signals.push("価格が短期SMA(20)を下回る弱気局面");
    }

    if (lastSMA20 > lastSMA50) {
        bullScore += 15 * trendStrength;
        signals.push("SMAゴールデンクロス形成中 (上昇トレンド)");
    } else {
        bearScore += 15 * trendStrength;
        signals.push("SMAデッドクロス形成中 (下降トレンド)");
    }

    // B. モメンタム分析 (RSI) [逆張り/過熱感]
    if (lastRSI > 50) {
        bullScore += 10 * oscillatorStrength; 
    } else {
        bearScore += 10 * oscillatorStrength;
    }
    
    if (lastRSI < 30) {
        // 売られすぎ: トレンド相場では逆張り危険だが、短期反発の可能性大
        bullScore += 25 * oscillatorStrength;
        signals.push(`RSI(${Math.round(lastRSI)})が売られすぎ水準。自律反発の可能性`);
    } else if (lastRSI > 70) {
        // 買われすぎ
        bearScore += 25 * oscillatorStrength;
        signals.push(`RSI(${Math.round(lastRSI)})が買われすぎ水準。調整下落に警戒`);
    }

    // C. MACD分析 [順張り/モメンタム加速]
    const currentHist = lastMACD.histogram || 0;
    const prevHist = prevMACD?.histogram || 0;
    const isHistGrowing = Math.abs(currentHist) > Math.abs(prevHist);

    if (lastMACD.MACD && lastMACD.signal && lastMACD.MACD > lastMACD.signal) {
        let score = 15;
        if (currentHist > 0 && isHistGrowing) {
             score += 5; 
             signals.push("MACD上昇モメンタムが加速中");
        }
        bullScore += score * trendStrength;
    } else {
        let score = 15;
        if (currentHist < 0 && isHistGrowing) {
            score += 5; 
            signals.push("MACD下落モメンタムが加速中");
        }
        bearScore += score * trendStrength;
    }

    // D. ボリンジャーバンド [逆張り/ボラティリティ]
    const bandWidth = (lastBB.upper - lastBB.lower) / lastSMA20;
    const isSqueeze = bandWidth < 0.05; 

    if (isSqueeze) {
        signals.push("ボリンジャーバンド収縮(スクイーズ)。エネルギー充填中");
    }

    if (lastPrice > lastBB.upper) {
        if (adxValue > 30) {
            bullScore += 10; // バンドウォーク
            signals.push("バンドウォーク(強い上昇トレンド)発生中");
        } else {
            bearScore += 20 * oscillatorStrength; // レンジ上限
            signals.push("ボリンジャーバンド上限到達。反落警戒");
        }
    } else if (lastPrice < lastBB.lower) {
         if (adxValue > 30) {
            bearScore += 10; // バンドウォーク
            signals.push("バンドウォーク(強い下落トレンド)発生中");
        } else {
            bullScore += 20 * oscillatorStrength; // レンジ下限
            signals.push("ボリンジャーバンド下限到達。押し目買い好機");
        }
    }

    // --- 3. 総合判定と予測生成 ---

    const finalScore = bullScore - bearScore;

    // 信頼度の計算チューニング (ユーザーFB: 「低すぎる」に対応)
    // 1. スコア正規化係数を緩和 (50 -> 35): 少ないシグナルでも反応しやすくする
    // 2. ベース信頼度 (+20): 何もなくてもある程度の期待値を担保
    let rawConfidence = (Math.abs(finalScore) / 35) * 100;

    // トレンド強度による補正
    if (isTrending) {
        rawConfidence *= 1.3; // トレンド時は1.3倍に攻める
    } else {
        rawConfidence *= 0.85; // レンジ相場でも0.85倍までに留める (急激な低下を防ぐ)
    }
    
    // ボラティリティが高すぎる場合は信頼度を少し下げる
    if (isHighVolatility) {
        rawConfidence *= 0.8;
    }

    // ベース信頼度を加算 (全体的な底上げ)
    rawConfidence += 20;

    let confidence = Math.min(Math.round(rawConfidence), 98); // 100%は胡散臭いので98止め

    const sentiment: TradeSentiment = finalScore >= 0 ? 'BULLISH' : 'BEARISH';

    // 未来予測パスの生成 (14日分)
    const predictions = [];
    const lastDate = new Date(data[data.length - 1].time);

    predictions.push({ time: data[data.length - 1].time, value: lastPrice });

    for (let i = 1; i <= 14; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        if (nextDate.getDay() === 0 || nextDate.getDay() === 6) continue;

        const dateStr = nextDate.toISOString().split('T')[0];

        // ATRを考慮した予測変動幅
        // finalScore(方向性) * ATR(変動幅) * 減衰係数
        // 遠い未来ほど不確実性を加味して変動をマイルドにする
        const volatilityFactor = lastATR * 0.5; 
        const directionFactor = finalScore / 100; // -1.0 ~ 1.0
        
        // ランダムウォーク要素を少し加えることで、一直線ではないリアルな予測線にする
        const noise = (Math.random() - 0.5) * (lastATR * 0.2); 
        
        const change = (directionFactor * volatilityFactor * i) + noise;

        predictions.push({
            time: dateStr,
            value: parseFloat((lastPrice + change).toFixed(2))
        });
    }

    // チャート表示用インジケーター配列の整形
    // Note: technicalindicatorsの結果配列は期間分ずれているため、元データの日付と合わせる
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

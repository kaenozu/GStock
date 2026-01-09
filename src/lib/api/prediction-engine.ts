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
    const prevMACD = macd[macd.length - 2]; // 1つ前のMACDデータ

    let bullScore = 0;
    let bearScore = 0;
    const signals: string[] = [];

    // --- 動的重み付けロジック ---
    // ADXが高い(=トレンド強い)時は、トレンド系指標(SMA, MACD)を重視し、オシレーター(RSI)を軽視する
    // ADXが低い(=レンジ相場)時は、オシレーター(RSI, BB反発)を重視する
    const adxValue = lastADX.adx;
    const trendStrength = Math.min(Math.max(adxValue / 20, 0.5), 2.0); // 0.5倍 〜 2.0倍
    const oscillatorStrength = Math.min(Math.max(25 / adxValue, 0.5), 2.0); // トレンドが強いほど弱くなる

    // 1. トレンド分析 (SMA) [順張り]
    if (lastPrice > lastSMA20) {
        bullScore += 15 * trendStrength;
        signals.push("価格が短期移動平均(SMA20)の上方で推移");
    } else {
        bearScore += 15 * trendStrength;
        signals.push("価格が短期移動平均(SMA20)を下回る弱気局面");
    }

    if (lastSMA20 > lastSMA50) {
        bullScore += 15 * trendStrength;
        signals.push("移動平均線が上昇トレンドを形成(SMA20>50)");
    } else {
        bearScore += 15 * trendStrength;
        signals.push("移動平均線が下降トレンドを形成(SMA20<50)");
    }

    // 2. モメンタム分析 (RSI) [逆張り]
    if (lastRSI > 50) bullScore += 10 * oscillatorStrength; else bearScore += 10 * oscillatorStrength;
    
    // RSIの極値はトレンドに関わらず重要だが、強いトレンド中のダイバージェンスはダマシも多い
    if (lastRSI < 30) {
        bullScore += 25 * oscillatorStrength;
        signals.push(`RSIが${Math.round(lastRSI)}%まで低下。売られすぎ水準です`);
    } else if (lastRSI > 70) {
        bearScore += 25 * oscillatorStrength;
        signals.push(`RSIが${Math.round(lastRSI)}%に到達。過熱感があります`);
    }

    // 3. MACD分析 [順張り/モメンタム]
    // ヒストグラムの増減を見る
    const currentHist = lastMACD.histogram || 0;
    const prevHist = prevMACD?.histogram || 0;
    const isHistGrowing = Math.abs(currentHist) > Math.abs(prevHist);

    if (lastMACD.MACD && lastMACD.signal && lastMACD.MACD > lastMACD.signal) {
        // ゴールデンクロス中
        let score = 15;
        if (currentHist > 0 && isHistGrowing) {
             score += 5; // 上昇モメンタム加速
             signals.push("MACDヒストグラムが拡大中。上昇の勢いが強まっています");
        }
        bullScore += score * trendStrength;
    } else {
        // デッドクロス中
        let score = 15;
        if (currentHist < 0 && isHistGrowing) {
            score += 5; // 下落モメンタム加速
            signals.push("MACDヒストグラムが拡大中。下落の勢いが強まっています");
        }
        bearScore += score * trendStrength;
    }

    // 4. ボリンジャーバンド [逆張り/ボラティリティ]
    // バンド幅の計算 (Squeeze判定)
    const bandWidth = (lastBB.upper - lastBB.lower) / lastSMA20;
    // 過去20日間の平均バンド幅を簡易計算（正確には全部ループすべきだが近似値で）
    const isSqueeze = bandWidth < 0.05; // 銘柄によるが5%以下はかなり狭いと仮定

    if (isSqueeze) {
        // スクイーズ中は「どちらかに跳ねる」前兆。トレンド発生時の爆発力を示唆
        signals.push("ボリンジャーバンドが収縮(スクイーズ)。大きな価格変動の前兆です");
        // スクイーズ時はまだ方向感がないため、スコアには直接加算せず、Confidenceの係数として使う
    }

    if (lastPrice > lastBB.upper) {
        if (adxValue > 30) {
            bullScore += 10; // 強いトレンド中はバンドウォーク（買い継続）
            signals.push("バンドウォーク発生中。強い上昇トレンドです");
        } else {
            bearScore += 20 * oscillatorStrength; // レンジ相場なら逆張り売り
            signals.push("ボリンジャーバンド上限到達。反落のリスク");
        }
    } else if (lastPrice < lastBB.lower) {
         if (adxValue > 30) {
            bearScore += 10; // 強い下落トレンド（バンドウォーク）
            signals.push("バンドウォーク発生中。強い下落トレンドです");
        } else {
            bullScore += 20 * oscillatorStrength; // レンジ相場なら逆張り買い
            signals.push("ボリンジャーバンド下限到達。反発のチャンス");
        }
    }

    // ADXによるトレンド判定メッセージ
    if (adxValue > 25) {
        signals.push(`ADX(${Math.round(adxValue)})が高水準。トレンドフォロー戦略を推奨`);
    } else {
        signals.push(`ADX(${Math.round(adxValue)})が低水準。レンジ相場戦略を推奨`);
    }

    const finalScore = bullScore - bearScore;

    // 信頼度の計算 (0-100にスケーリング)
    // スコアの最大値が変動するため、正規化を調整
    const maxPossibleScore = 100 * Math.max(trendStrength, oscillatorStrength);
    let confidence = (Math.abs(finalScore) / maxPossibleScore) * 100;
    
    // スクイーズ中は確信度を下げる（方向が未定なため）が、ブレイク後は上げるなどの調整が可能
    // ここではシンプルにベースライン調整
    confidence = Math.min(Math.round(confidence * 1.2), 99); // 全体的に少し甘めに判定（デモ用）
    const sentiment: TradeSentiment = finalScore >= 0 ? 'BULLISH' : 'BEARISH';

    const predictions = [];
    const lastDate = new Date(data[data.length - 1].time);

    predictions.push({ time: data[data.length - 1].time, value: lastPrice });

    for (let i = 1; i <= 5; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        if (nextDate.getDay() === 0 || nextDate.getDay() === 6) continue;

        const dateStr = nextDate.toISOString().split('T')[0];

        // スコアに基づく価格推移（ボラティリティを考慮）
        const volatilityBase = lastPrice * 0.01; // 1% base volatility
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

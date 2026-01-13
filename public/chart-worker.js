self.onmessage = (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'INIT':
            handleInit(data);
            break;
        case 'UPDATE_DATA':
            handleUpdateData(data);
            break;
        case 'CALCULATE_INDICATORS':
            handleCalculateIndicators(data);
            break;
        default:
            console.warn('[ChartWorker] Unknown message type:', type);
    }
};

function handleInit(data) {
    console.log('[ChartWorker] Initialized for symbol:', data.symbol);
    self.postMessage({ type: 'INITIALIZED', data: { symbol: data.symbol } });
}

function handleUpdateData(data) {
    const processedData = data.candles.map((candle) => ({
        time: candle.time,
        open: Number(candle.open.toFixed(2)),
        high: Number(candle.high.toFixed(2)),
        low: Number(candle.low.toFixed(2)),
        close: Number(candle.close.toFixed(2)),
        volume: candle.volume,
    }));

    self.postMessage({ type: 'DATA_UPDATED', data: processedData });
}

function handleCalculateIndicators(data) {
    const { candles, indicator, period = 14 } = data;
    let result = [];

    switch (indicator) {
        case 'SMA':
            result = calculateSMA(candles, period);
            break;
        case 'EMA':
            result = calculateEMA(candles, period);
            break;
        case 'RSI':
            result = calculateRSI(candles, period);
            break;
        case 'MACD':
            result = calculateMACD(candles);
            break;
        case 'BB':
            result = calculateBollingerBands(candles, period);
            break;
    }

    self.postMessage({ type: 'INDICATORS_CALCULATED', data: { indicator, result } });
}

function calculateSMA(candles, period) {
    const result = [];

    for (let i = period - 1; i < candles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += candles[i - j].close;
        }
        const value = sum / period;
        result.push({ time: candles[i].time, value });
    }

    return result;
}

function calculateEMA(candles, period) {
    const result = [];
    const k = 2 / (period + 1);

    if (candles.length < period) {
        return result;
    }

    let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;
    result.push({ time: candles[period - 1].time, value: ema });

    for (let i = period; i < candles.length; i++) {
        ema = (candles[i].close - ema) * k + ema;
        result.push({ time: candles[i].time, value: ema });
    }

    return result;
}

function calculateRSI(candles, period) {
    const result = [];

    if (candles.length < period + 1) {
        return result;
    }

    let gains = [];
    let losses = [];

    for (let i = 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i - 1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
        const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

        let rsi = 50;
        if (avgLoss !== 0) {
            const rs = avgGain / avgLoss;
            rsi = 100 - (100 / (1 + rs));
        }

        result.push({ time: candles[i + 1].time, value: rsi });
    }

    return result;
}

function calculateMACD(candles) {
    const ema12 = calculateEMA(candles, 12);
    const ema26 = calculateEMA(candles, 26);
    const result = [];

    for (let i = 0; i < ema12.length && i < ema26.length; i++) {
        if (ema12[i].time === ema26[i].time) {
            result.push({
                time: ema12[i].time,
                value: ema12[i].value - ema26[i].value,
            });
        }
    }

    return result;
}

function calculateBollingerBands(candles, period) {
    const sma = calculateSMA(candles, period);
    const result = [];

    for (let i = 0; i < sma.length; i++) {
        const startIdx = i + period - 1;
        const subset = candles.slice(startIdx - period + 1, startIdx + 1);
        const stdDev = calculateStandardDeviation(subset.map(c => c.close));

        result.push({
            time: sma[i].time,
            value: sma[i].value + (stdDev * 2),
        });
    }

    return result;
}

function calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
}
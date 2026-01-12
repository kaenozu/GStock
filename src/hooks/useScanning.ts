/**
 * useScanning Hook
 * @description 銘柄スキャン・分析のカスタムフック
 * @module hooks/useScanning
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnalysisResult, TradeHistoryItem, StockDataPoint, TradeSentiment, MarketRegime } from '@/types/market';
import { MONITOR_LIST } from '@/config/constants';
import { PredictionClient, AutoEvaluator } from '@/lib/accuracy';
import { AlertService } from '@/lib/alerts';
import { ErrorLogger } from '@/lib/errors';
import { toast } from 'sonner';

/** スキャン間隔（ミリ秒） */
const SCAN_INTERVAL_MS = 10000;

/** エラー表示の閾値 */
const ERROR_TOAST_THRESHOLD = 3;

/** エラークリアまでの時間（ミリ秒） */
const ERROR_CLEAR_DELAY_MS = 5000;

/**
 * Calculate ADX (Average Directional Index) for trend strength
 * ADX > 25: Strong trend, ADX < 20: Weak/No trend
 */
function calculateADX(history: StockDataPoint[], period: number = 14): number {
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
function calculateAnalysis(history: StockDataPoint[]): {
    sentiment: TradeSentiment;
    confidence: number;
    rsi: number;
    regime: MarketRegime;
    adx?: number;
} {
    if (history.length < 20) {
        return { sentiment: 'NEUTRAL', confidence: 50, rsi: 50, regime: 'SIDEWAYS' };
    }

    // Calculate RSI (14-period)
    const closes = history.slice(-15).map(d => d.close);
    let gains = 0, losses = 0;
    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Calculate ADX for trend strength
    const adx = calculateADX(history);
    const isStrongTrend = adx > 25;
    const isWeakTrend = adx < 20;

    // Calculate short-term trend (SMA5 vs SMA20)
    const sma5 = history.slice(-5).reduce((a, b) => a + b.close, 0) / 5;
    const sma20 = history.slice(-20).reduce((a, b) => a + b.close, 0) / 20;
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

/**
 * 銘柄スキャンフック
 * @param isPaused - スキャンが一時停止中か
 * @param updateBestTrade - 分析結果を更新するコールバック
 * @param addToHistory - 履歴に追加するコールバック
 * @returns スキャン状態
 */
export const useScanning = (
    isPaused: boolean,
    updateBestTrade: (result: AnalysisResult | null) => void,
    addToHistory: (item: TradeHistoryItem) => void
) => {
    const [scanningSymbol, setScanningSymbol] = useState<string | null>(null);
    const [isScanLoading, setIsScanLoading] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [failedSymbolsList, setFailedSymbolsList] = useState<string[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const symbolIndexRef = useRef(0);
    const isVisibleRef = useRef(true);

    // 失敗銘柄をSetとしてメモ化
    const failedSymbols = useMemo(() => new Set(failedSymbolsList), [failedSymbolsList]);

    // Visibility APIでバックグラウンドタブを検出
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    /**
     * 単一銘柄をスキャン
     */
    const scanSymbol = useCallback(async (symbol: string) => {
        // バックグラウンドタブではスキップ
        if (!isVisibleRef.current) {
            return;
        }

        setIsScanLoading(true);
        setScanningSymbol(symbol);

        try {
            const res = await fetch(`/api/stock?symbol=${symbol}`);
            if (!res.ok) throw new Error('Fetch failed');

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const history: StockDataPoint[] = Array.isArray(data) ? data : [];
            const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;

            // Calculate RSI and sentiment from actual data
            const { sentiment, confidence, rsi, regime } = calculateAnalysis(history);

            const result: AnalysisResult = {
                symbol,
                history,
                predictions: [],
                sentiment,
                confidence,
                marketRegime: regime,
                signals: [],
                stats: {
                    price: lastPrice,
                    rsi,
                    trend: sentiment === 'BULLISH' ? 'UP' : sentiment === 'BEARISH' ? 'DOWN' : 'NEUTRAL',
                    adx: 20,
                    regime
                }
            };

            updateBestTrade(result);

            // 信頼度が高い場合は履歴に追加
            if (result.confidence >= 70) {
                addToHistory({
                    symbol,
                    type: result.sentiment === 'BULLISH' ? 'BUY' : result.sentiment === 'BEARISH' ? 'SELL' : 'HOLD',
                    confidence: result.confidence,
                    time: new Date().toISOString()
                });
            }

            // 予測をログ（非同期、エラーは無視）
            PredictionClient.autoLog({
                symbol,
                predictedDirection: result.sentiment,
                confidence: result.confidence,
                priceAtPrediction: lastPrice,
                regime: result.marketRegime,
            }).catch(() => { /* ignore */ });

            // アラート送信
            const signalType = result.sentiment === 'BULLISH' ? 'BUY' : result.sentiment === 'BEARISH' ? 'SELL' : 'HOLD';
            AlertService.alert({
                symbol,
                signal: signalType,
                confidence: result.confidence,
                price: lastPrice,
            });

            // 成功したら失敗リストから削除
            if (failedSymbolsList.includes(symbol)) {
                setFailedSymbolsList(prev => prev.filter(s => s !== symbol));
            }

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            ErrorLogger.error(errorMsg, 'Scanner', { symbol });
            
            // 失敗銘柄を追跡
            if (!failedSymbolsList.includes(symbol)) {
                setFailedSymbolsList(prev => [...prev, symbol]);
            }
            setScanError(`${symbol}: ${errorMsg}`);
            
            // 複数失敗時にトースト表示
            if (failedSymbolsList.length >= ERROR_TOAST_THRESHOLD) {
                toast.error('複数の銘柄でエラー', {
                    description: 'データ取得に問題が発生しています',
                    id: 'scan-error',
                });
            }
            
            setTimeout(() => setScanError(null), ERROR_CLEAR_DELAY_MS);
        } finally {
            setIsScanLoading(false);
        }
    }, [updateBestTrade, addToHistory, failedSymbolsList]);

    /**
     * 次のスキャン対象銘柄を取得
     */
    const getNextSymbol = useCallback((): string => {
        let attempts = 0;
        let symbol: string;
        
        do {
            symbol = MONITOR_LIST[symbolIndexRef.current % MONITOR_LIST.length];
            symbolIndexRef.current++;
            attempts++;
        } while (failedSymbols.has(symbol) && attempts < MONITOR_LIST.length);
        
        if (attempts >= MONITOR_LIST.length) {
            // 全銘柄失敗時はリセット
            setFailedSymbolsList([]);
            return MONITOR_LIST[0];
        }
        
        return symbol;
    }, [failedSymbols]);

    // スキャンループ
    useEffect(() => {
        if (isPaused) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // 起動時に自動評価を実行
        AutoEvaluator.evaluatePending().then(count => {
            if (count > 0) console.log(`AutoEvaluator: Evaluated ${count} pending predictions`);
        }).catch(err => {
            console.error('AutoEvaluator error:', err);
        });

        const runScan = () => {
            const symbol = getNextSymbol();
            scanSymbol(symbol);
        };

        // 初回スキャン
        runScan();
        
        // 定期スキャン
        intervalRef.current = setInterval(runScan, SCAN_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPaused, scanSymbol, getNextSymbol]);

    return { 
        scanningSymbol, 
        isScanLoading, 
        scanError, 
        failedSymbols,
        /** 失敗銘柄を手動リセット */
        resetFailedSymbols: useCallback(() => setFailedSymbolsList([]), []),
    };
};

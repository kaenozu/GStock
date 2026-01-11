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
 * Calculate RSI and derive sentiment from stock data
 */
function calculateAnalysis(history: StockDataPoint[]): {
    sentiment: TradeSentiment;
    confidence: number;
    rsi: number;
    regime: MarketRegime;
} {
    if (history.length < 14) {
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

    // Calculate short-term trend (SMA5 vs SMA20)
    const sma5 = history.slice(-5).reduce((a, b) => a + b.close, 0) / 5;
    const sma20 = history.slice(-20).reduce((a, b) => a + b.close, 0) / Math.min(20, history.length);
    const trendStrength = ((sma5 - sma20) / sma20) * 100;

    // Determine sentiment
    let sentiment: TradeSentiment = 'NEUTRAL';
    let confidence = 50;

    if (rsi > 70) {
        sentiment = 'BEARISH'; // Overbought - expect reversal
        confidence = Math.min(90, 50 + (rsi - 70) * 2);
    } else if (rsi < 30) {
        sentiment = 'BULLISH'; // Oversold - expect reversal
        confidence = Math.min(90, 50 + (30 - rsi) * 2);
    } else if (trendStrength > 2) {
        sentiment = 'BULLISH';
        confidence = Math.min(80, 50 + trendStrength * 5);
    } else if (trendStrength < -2) {
        sentiment = 'BEARISH';
        confidence = Math.min(80, 50 + Math.abs(trendStrength) * 5);
    }

    // Determine regime
    let regime: MarketRegime = 'SIDEWAYS';
    if (rsi > 60 && trendStrength > 1) regime = 'BULL_TREND';
    else if (rsi < 40 && trendStrength < -1) regime = 'BEAR_TREND';
    else if (Math.abs(trendStrength) > 3) regime = 'VOLATILE';

    return { sentiment, confidence: Math.round(confidence), rsi: Math.round(rsi), regime };
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
<<<<<<< HEAD
            console.error(`Scan error for ${symbol}:`, error);

            // Track failed symbols to skip them temporarily
            setFailedSymbols(prev => new Set([...prev, symbol]));
            setScanError(`${symbol}: ${errorMsg}`);

            // Clear error after 5 seconds
            setTimeout(() => setScanError(null), 5000);
=======
            
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
>>>>>>> origin/main
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
<<<<<<< HEAD
            // Skip failed symbols for this cycle
            let attempts = 0;
            let symbol: string;
            do {
                symbol = MONITOR_LIST[symbolIndexRef.current % MONITOR_LIST.length];
                symbolIndexRef.current++;
                attempts++;
            } while (failedSymbols.has(symbol) && attempts < MONITOR_LIST.length);

            if (attempts >= MONITOR_LIST.length) {
                // All symbols failed, reset and try again
                setFailedSymbols(new Set());
                symbol = MONITOR_LIST[0];
            }

            scanSymbol(symbol);
        };

        // Phase 19: Run auto-evaluation on startup
        AutoEvaluator.evaluatePending();

=======
            const symbol = getNextSymbol();
            scanSymbol(symbol);
        };

        // 初回スキャン
>>>>>>> origin/main
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

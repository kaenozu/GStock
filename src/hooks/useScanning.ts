'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnalysisResult, TradeHistoryItem, StockDataPoint, MarketStats, TradeSentiment, MarketRegime } from '@/types/market';
import { MONITOR_LIST } from '@/config/constants';
import { PredictionLogger, AutoEvaluator } from '@/lib/accuracy';
import { AlertService } from '@/lib/alerts';

export const useScanning = (
    isPaused: boolean,
    updateBestTrade: (result: AnalysisResult | null) => void,
    addToHistory: (item: TradeHistoryItem) => void
) => {
    const [scanningSymbol, setScanningSymbol] = useState<string | null>(null);
    const [isScanLoading, setIsScanLoading] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [failedSymbols, setFailedSymbols] = useState<Set<string>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const symbolIndexRef = useRef(0);

    const scanSymbol = useCallback(async (symbol: string) => {
        setIsScanLoading(true);
        setScanningSymbol(symbol);

        try {
            const res = await fetch(`/api/stock?symbol=${symbol}`);
            if (!res.ok) throw new Error('Fetch failed');

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Build minimal AnalysisResult
            const history: StockDataPoint[] = Array.isArray(data) ? data : [];
            const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;

            const result: AnalysisResult = {
                symbol,
                history,
                predictions: [],
                sentiment: 'NEUTRAL' as TradeSentiment,
                confidence: 50,
                marketRegime: 'SIDEWAYS' as MarketRegime,
                signals: [],
                stats: {
                    price: lastPrice,
                    rsi: 50,
                    trend: 'NEUTRAL',
                    adx: 20,
                    regime: 'SIDEWAYS'
                }
            };

            updateBestTrade(result);

            // Add to history if significant
            if (result.confidence >= 70) {
                addToHistory({
                    symbol,
                    type: result.sentiment === 'BULLISH' ? 'BUY' : result.sentiment === 'BEARISH' ? 'SELL' : 'HOLD',
                    confidence: result.confidence,
                    time: new Date().toISOString()
                });
            }

            // Phase 19: Auto-log prediction
            PredictionLogger.autoLog({
                symbol,
                predictedDirection: result.sentiment,
                confidence: result.confidence,
                priceAtPrediction: lastPrice,
                regime: result.marketRegime,
            });

            // Phase 19: Send alert
            const signalType = result.sentiment === 'BULLISH' ? 'BUY' : result.sentiment === 'BEARISH' ? 'SELL' : 'HOLD';
            AlertService.alert({
                symbol,
                signal: signalType,
                confidence: result.confidence,
                price: lastPrice,
            });

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Scan error for ${symbol}:`, error);
            
            // Track failed symbols to skip them temporarily
            setFailedSymbols(prev => new Set([...prev, symbol]));
            setScanError(`${symbol}: ${errorMsg}`);
            
            // Clear error after 5 seconds
            setTimeout(() => setScanError(null), 5000);
        } finally {
            setIsScanLoading(false);
        }
    }, [updateBestTrade, addToHistory]);

    useEffect(() => {
        if (isPaused) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        const runScan = () => {
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
        AutoEvaluator.evaluatePending().then(count => {
            if (count > 0) console.log(`AutoEvaluator: Evaluated ${count} pending predictions`);
        });

        runScan();
        intervalRef.current = setInterval(runScan, 10000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPaused, scanSymbol]);

    return { scanningSymbol, isScanLoading, scanError, failedSymbols };
};

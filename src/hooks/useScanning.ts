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

    // Calculate RSI and derive sentiment from stock data
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

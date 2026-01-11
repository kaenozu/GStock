/**
 * useScanning Hook
 * @description 銀柄スキャン・分析のカスタムフック
 * @module hooks/useScanning
 * @refactored 分析ロジックをStockAnalyzerに分離
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnalysisResult, TradeHistoryItem, StockDataPoint } from '@/types/market';
import { MONITOR_LIST } from '@/config/constants';
import { PredictionClient, AutoEvaluator } from '@/lib/accuracy';
import { AlertService } from '@/lib/alerts';
import { ErrorLogger } from '@/lib/errors';
import { StockAnalyzer } from '@/lib/analysis/StockAnalyzer';
import { translateError, messages } from '@/lib/i18n/messages';
import { toast } from 'sonner';

/** スキャン間隔（ミリ秒） */
const SCAN_INTERVAL_MS = 10000;

/** エラー表示の閾値 */
const ERROR_TOAST_THRESHOLD = 3;

/** エラークリアまでの時間（ミリ秒） */
const ERROR_CLEAR_DELAY_MS = 5000;

/** スキャン結果 */
export interface ScanResult {
    scanningSymbol: string | null;
    isScanLoading: boolean;
    scanError: string | null;
    failedSymbols: Set<string>;
    resetFailedSymbols: () => void;
}

/**
 * 銀柄スキャンフック
 * @param isPaused - スキャンが一時停止中か
 * @param updateBestTrade - 分析結果を更新するコールバック
 * @param addToHistory - 履歴に追加するコールバック
 * @returns スキャン状態
 */
export const useScanning = (
    isPaused: boolean,
    updateBestTrade: (result: AnalysisResult | null) => void,
    addToHistory: (item: TradeHistoryItem) => void
): ScanResult => {
    const [scanningSymbol, setScanningSymbol] = useState<string | null>(null);
    const [isScanLoading, setIsScanLoading] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [failedSymbolsList, setFailedSymbolsList] = useState<string[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const symbolIndexRef = useRef(0);
    const isVisibleRef = useRef(true);

    // 失敗銀柄をSetとしてメモ化
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
     * 単一銀柄をスキャン
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
            if (!res.ok) {
                throw new Error(res.status === 429 ? 'Rate limit exceeded' : 'Fetch failed');
            }

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const history: StockDataPoint[] = Array.isArray(data) ? data : [];
            
            // StockAnalyzerを使用して分析（分離されたロジック）
            const result = StockAnalyzer.createAnalysisResult(symbol, history);

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
            const lastPrice = history.length > 0 ? history[history.length - 1].close : 0;
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
            const translatedError = translateError(errorMsg);
            
            ErrorLogger.error(errorMsg, 'Scanner', { symbol });
            
            // 失敗銀柄を追跡
            if (!failedSymbolsList.includes(symbol)) {
                setFailedSymbolsList(prev => [...prev, symbol]);
            }
            setScanError(`${symbol}: ${translatedError}`);
            
            // 複数失敗時にトースト表示
            if (failedSymbolsList.length >= ERROR_TOAST_THRESHOLD) {
                toast.error(messages.notifications.multipleErrors, {
                    description: messages.notifications.dataFetchError,
                    id: 'scan-error',
                });
            }
            
            setTimeout(() => setScanError(null), ERROR_CLEAR_DELAY_MS);
        } finally {
            setIsScanLoading(false);
        }
    }, [updateBestTrade, addToHistory, failedSymbolsList]);

    /**
     * 次のスキャン対象銀柄を取得
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
            // 全銀柄失敗時はリセット
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
            if (count > 0) console.log(`AutoEvaluator: ${count}件の予測を評価しました`);
        }).catch(err => {
            console.error('AutoEvaluatorエラー:', err);
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
        resetFailedSymbols: useCallback(() => setFailedSymbolsList([]), []),
    };
};

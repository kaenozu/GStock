import { useEffect, useRef } from 'react';

interface ChartWorkerHookResult {
    initWorker: (symbol: string) => void;
    updateData: (candles: any[]) => void;
    calculateIndicator: (indicator: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB', period?: number) => void;
    onDataUpdated: (callback: (data: any[]) => void) => void;
    onIndicatorsCalculated: (callback: (data: { indicator: string; result: any[] }) => void) => void;
    terminateWorker: () => void;
}

export function useChartWorker(): ChartWorkerHookResult {
    const workerRef = useRef<Worker | null>(null);
    const onDataUpdatedCallback = useRef<((data: any[]) => void) | null>(null);
    const onIndicatorsCalculatedCallback = useRef<((data: { indicator: string; result: any[] }) => void) | null>(null);

    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const initWorker = (symbol: string) => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        workerRef.current = new Worker('/chart-worker.js');

        workerRef.current.onmessage = (event) => {
            const { type, data } = event.data;

            switch (type) {
                case 'DATA_UPDATED':
                    if (onDataUpdatedCallback.current) {
                        onDataUpdatedCallback.current(data);
                    }
                    break;
                case 'INDICATORS_CALCULATED':
                    if (onIndicatorsCalculatedCallback.current) {
                        onIndicatorsCalculatedCallback.current(data);
                    }
                    break;
                case 'INITIALIZED':
                    console.log('[ChartWorker] Worker initialized:', data);
                    break;
            }
        };

        workerRef.current.postMessage({
            type: 'INIT',
            data: { symbol },
        });
    };

    const updateData = (candles: any[]) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'UPDATE_DATA',
                data: { candles },
            });
        }
    };

    const calculateIndicator = (indicator: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB', period?: number) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'CALCULATE_INDICATORS',
                data: { candles: [], indicator, period },
            });
        }
    };

    const onDataUpdated = (callback: (data: any[]) => void) => {
        onDataUpdatedCallback.current = callback;
    };

    const onIndicatorsCalculated = (callback: (data: { indicator: string; result: any[] }) => void) => {
        onIndicatorsCalculatedCallback.current = callback;
    };

    const terminateWorker = () => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
    };

    return {
        initWorker,
        updateData,
        calculateIndicator,
        onDataUpdated,
        onIndicatorsCalculated,
        terminateWorker,
    };
}
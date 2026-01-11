/**
 * useRealtimePrice Hook
 * @description WebSocketを使用したリアルタイム価格取得
 * @module hooks/useRealtimePrice
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FinnhubWebSocket, NormalizedPrice, ConnectionStatus } from '@/lib/websocket';

/** フックの戻り値 */
interface UseRealtimePriceReturn {
    /** 現在価格（シンボルごと） */
    prices: Record<string, NormalizedPrice>;
    /** 接続ステータス */
    status: ConnectionStatus;
    /** エラーメッセージ */
    error: string | null;
    /** シンボルを購読 */
    subscribe: (symbol: string) => void;
    /** シンボルの購読を解除 */
    unsubscribe: (symbol: string) => void;
    /** 接続を開始 */
    connect: () => void;
    /** 接続を切断 */
    disconnect: () => void;
    /** WebSocketが有効か */
    isEnabled: boolean;
}

/** APIキーを取得 */
const getApiKey = (): string => {
    if (typeof window === 'undefined') return '';
    // クライアント側では環境変数を使用できないため、
    // デモ用にハードコードするか、APIエンドポイント経由で取得する
    return process.env.NEXT_PUBLIC_FINNHUB_KEY || '';
};

/**
 * リアルタイム価格フック
 * @param initialSymbols - 初期購読シンボル
 * @returns 価格データと操作関数
 */
export function useRealtimePrice(initialSymbols: string[] = []): UseRealtimePriceReturn {
    const [prices, setPrices] = useState<Record<string, NormalizedPrice>>({});
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<FinnhubWebSocket | null>(null);
    const apiKey = getApiKey();
    const isEnabled = !!apiKey;

    // WebSocketインスタンスの初期化
    useEffect(() => {
        if (!isEnabled) {
            console.log('[useRealtimePrice] WebSocket disabled: No API key');
            return;
        }

        const ws = new FinnhubWebSocket(apiKey);
        wsRef.current = ws;

        // イベントハンドラを登録
        const unsubPrice = ws.onPrice((price) => {
            setPrices((prev) => ({
                ...prev,
                [price.symbol]: price,
            }));
        });

        const unsubStatus = ws.onStatus((newStatus) => {
            setStatus(newStatus);
            if (newStatus === 'connected') {
                setError(null);
            }
        });

        const unsubError = ws.onError((err) => {
            setError(err);
        });

        // 接続開始
        ws.connect();

        // 初期シンボルを購読
        for (const symbol of initialSymbols) {
            ws.subscribe(symbol);
        }

        // クリーンアップ
        return () => {
            unsubPrice();
            unsubStatus();
            unsubError();
            ws.disconnect();
            wsRef.current = null;
        };
    // initialSymbolsは初回のみ使用
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey, isEnabled]);

    const subscribe = useCallback((symbol: string) => {
        wsRef.current?.subscribe(symbol);
    }, []);

    const unsubscribe = useCallback((symbol: string) => {
        wsRef.current?.unsubscribe(symbol);
    }, []);

    const connect = useCallback(() => {
        wsRef.current?.connect();
    }, []);

    const disconnect = useCallback(() => {
        wsRef.current?.disconnect();
    }, []);

    return {
        prices,
        status,
        error,
        subscribe,
        unsubscribe,
        connect,
        disconnect,
        isEnabled,
    };
}

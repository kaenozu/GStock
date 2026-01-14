'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { NormalizedPrice, ConnectionStatus } from '@/lib/websocket';

interface UseRealtimePriceReturn {
    prices: Record<string, NormalizedPrice>;
    status: ConnectionStatus;
    error: string | null;
    usingFallback: boolean;
    subscribe: (symbol: string) => void;
    unsubscribe: (symbol: string) => void;
    connect: () => void;
    disconnect: () => void;
    isEnabled: boolean;
}

export function useRealtimePrice(initialSymbols: string[] = []): UseRealtimePriceReturn {
    const [prices, setPrices] = useState<Record<string, NormalizedPrice>>({});
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [error, setError] = useState<string | null>(null);
    const [usingFallback, setUsingFallback] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const fallbackIntervalRef = useRef<Record<string, NodeJS.Timeout>>({});

    const fetchFallbackPrice = useCallback(async (symbol: string) => {
        try {
            const response = await fetch(`/api/stock/fallback?symbol=${symbol}`);
            if (response.ok) {
                const data = await response.json();
                const priceData: NormalizedPrice = {
                    symbol: data.symbol,
                    price: data.price,
                    volume: data.volume || 0,
                    timestamp: new Date(data.timestamp).getTime()
                };
                setPrices(prev => ({
                    ...prev,
                    [symbol]: priceData
                }));
            }
        } catch (err) {
            console.error('[useRealtimePrice] Fallback fetch error:', err);
        }
    }, []);

    const stopFallbackPolling = useCallback((symbol: string) => {
        if (fallbackIntervalRef.current[symbol]) {
            clearInterval(fallbackIntervalRef.current[symbol]);
            delete fallbackIntervalRef.current[symbol];
        }
    }, []);

    const startFallbackPolling = useCallback((symbol: string) => {
        stopFallbackPolling(symbol);
        fetchFallbackPrice(symbol);
        fallbackIntervalRef.current[symbol] = setInterval(() => {
            fetchFallbackPrice(symbol);
        }, 5000);
    }, [fetchFallbackPrice, stopFallbackPolling]);

    const subscribe = useCallback((symbol: string) => {
        const upperSymbol = symbol.toUpperCase();

        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe', upperSymbol);
        }

        if (usingFallback) {
            startFallbackPolling(upperSymbol);
        }
    }, [usingFallback, startFallbackPolling]);

    const unsubscribe = useCallback((symbol: string) => {
        const upperSymbol = symbol.toUpperCase();

        if (socketRef.current?.connected) {
            socketRef.current.emit('unsubscribe', upperSymbol);
        }

        stopFallbackPolling(upperSymbol);
    }, [stopFallbackPolling]);

    useEffect(() => {
        fetch('/api/socket/io').finally(() => {
            const socket = io({
                path: '/api/socket/io',
                addTrailingSlash: false,
                reconnectionAttempts: 5,
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                setStatus('connected');
                setError(null);
                console.log('[useRealtimePrice] Socket connected');
                initialSymbols.forEach(sym => socket.emit('subscribe', sym.toUpperCase()));
            });

            socket.on('disconnect', () => {
                setStatus('disconnected');
                console.log('[useRealtimePrice] Socket disconnected');
            });

            socket.on('connect_error', (err: any) => {
                setStatus('error');
                setError(err.message);
                console.error('[useRealtimePrice] Connection error:', err);
                setUsingFallback(true);
            });

            socket.on('connection_status', (data) => {
                setUsingFallback(data.usingMockData);
            });

            socket.on('price', (data: any) => {
                const priceData: NormalizedPrice = {
                    symbol: data.symbol,
                    price: data.price,
                    volume: data.volume || 0,
                    timestamp: new Date(data.timestamp).getTime()
                };

                setPrices(prev => ({
                    ...prev,
                    [data.symbol]: priceData
                }));
            });

            socket.on('price_update', (data: any) => {
                const priceData: NormalizedPrice = {
                    symbol: data.symbol,
                    price: data.price,
                    volume: 0,
                    timestamp: new Date(data.timestamp).getTime()
                };

                setPrices(prev => ({
                    ...prev,
                    [data.symbol]: priceData
                }));
            });
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            Object.values(fallbackIntervalRef.current).forEach(interval => clearInterval(interval));
        };
    }, [initialSymbols]);

    const connect = useCallback(() => {
        if (!socketRef.current?.connected) {
            socketRef.current?.connect();
        }
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current?.disconnect();
        }
    }, []);

    return {
        prices,
        status,
        error,
        usingFallback,
        subscribe,
        unsubscribe,
        connect,
        disconnect,
        isEnabled: true
    };
}

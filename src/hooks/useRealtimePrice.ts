'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { NormalizedPrice, ConnectionStatus } from '@/lib/websocket';

interface UseRealtimePriceReturn {
    prices: Record<string, NormalizedPrice>;
    status: ConnectionStatus;
    error: string | null;
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
    const socketRef = useRef<Socket | null>(null);

    // Initialize Socket.io
    useEffect(() => {
        // Trigger the socket initialization endpoint (only needed for serverless, but kept for robust path)
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
                // Resubscribe if needed, or handle initial subscriptions
                initialSymbols.forEach(sym => socket.emit('subscribe', sym));
            });

            socket.on('disconnect', () => {
                setStatus('disconnected');
                console.log('[useRealtimePrice] Socket disconnected');
            });

            socket.on('connect_error', (err) => {
                setStatus('error');
                setError(err.message);
                console.error('[useRealtimePrice] Connection error:', err);
            });

            socket.on('price_update', (data: any) => {
                // Map the incoming data to NormalizedPrice
                // Our socket-server emits { symbol, price, changePercent, timestamp }
                // We need to verify if this matches `NormalizedPrice`. 
                // Currently `socket-server.ts` emits partial data. Let's assume we map it here.
                const priceData: NormalizedPrice = {
                    symbol: data.symbol,
                    price: data.price,
                    volume: 0, // Mock server doesn't send volume yet
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
        };
    }, []);

    const subscribe = useCallback((symbol: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe', symbol);
        }
    }, []);

    const unsubscribe = useCallback((symbol: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('unsubscribe', symbol);
        }
    }, []);

    const connect = useCallback(() => {
        if (!socketRef.current?.connected) {
            socketRef.current?.connect();
        }
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current.disconnect();
        }
    }, []);

    return {
        prices,
        status,
        error,
        subscribe,
        unsubscribe,
        connect,
        disconnect,
        isEnabled: true // Always enabled for our custom server
    };
}

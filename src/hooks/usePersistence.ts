import { useState, useEffect, useCallback } from 'react';
import { WatchListItem, TradeHistoryItem } from '@/types/market';

export type ExecutionMode = 'PAPER' | 'LIVE';

// Helper to safely get from localStorage
const getInitialValue = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch {
        return defaultValue;
    }
};

export const usePersistence = () => {
    // Initialize state with values from localStorage (SSR-safe)
    const [watchlist, setWatchlist] = useState<WatchListItem[]>(() => 
        getInitialValue('gstock-watchlist', [])
    );
    const [history, setHistory] = useState<TradeHistoryItem[]>(() => 
        getInitialValue('gstock-history', [])
    );
    const [executionMode, setExecutionMode] = useState<ExecutionMode>(() => {
        const saved = getInitialValue<string>('gstock-mode', 'PAPER');
        return (saved === 'LIVE' || saved === 'PAPER') ? saved : 'PAPER';
    });

    // Sync to localStorage on changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gstock-watchlist', JSON.stringify(watchlist));
        }
    }, [watchlist]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gstock-history', JSON.stringify(history));
        }
    }, [history]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gstock-mode', executionMode);
        }
    }, [executionMode]);

    // Wrap setters in useCallback for stability
    const updateWatchlist = useCallback((updater: WatchListItem[] | ((prev: WatchListItem[]) => WatchListItem[])) => {
        setWatchlist(updater);
    }, []);

    const updateHistory = useCallback((updater: TradeHistoryItem[] | ((prev: TradeHistoryItem[]) => TradeHistoryItem[])) => {
        setHistory(updater);
    }, []);

    const updateExecutionMode = useCallback((mode: ExecutionMode) => {
        setExecutionMode(mode);
    }, []);

    return {
        watchlist, setWatchlist: updateWatchlist,
        history, setHistory: updateHistory,
        executionMode, setExecutionMode: updateExecutionMode
    };
};

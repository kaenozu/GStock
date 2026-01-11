import { useState, useEffect } from 'react';
import { WatchListItem, TradeHistoryItem } from '@/types/market';

export type ExecutionMode = 'PAPER' | 'LIVE';

export const usePersistence = () => {
    const [watchlist, setWatchlist] = useState<WatchListItem[]>([]);
    const [history, setHistory] = useState<TradeHistoryItem[]>([]);
    const [executionMode, setExecutionMode] = useState<ExecutionMode>('PAPER');

    useEffect(() => {
        const initializePersistence = () => {
            if (typeof window === 'undefined') return;

            const savedWatchlist = localStorage.getItem('gstock-watchlist');
            if (savedWatchlist) {
                try { setWatchlist(JSON.parse(savedWatchlist)); } catch { }
            }

            const savedHistory = localStorage.getItem('gstock-history');
            if (savedHistory) {
                try { setHistory(JSON.parse(savedHistory)); } catch { }
            }

            const savedMode = localStorage.getItem('gstock-mode');
            if (savedMode === 'LIVE' || savedMode === 'PAPER') {
                setExecutionMode(savedMode);
            }
        };
        initializePersistence();
    }, []);

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

    return {
        watchlist, setWatchlist,
        history, setHistory,
        executionMode, setExecutionMode
    };
};

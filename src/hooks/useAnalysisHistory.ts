'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalysisResult } from '@/types/market';
import { AnalysisHistoryService, AnalysisHistoryEntry } from '@/lib/storage/AnalysisHistoryService';

export function useAnalysisHistory(symbol?: string) {
    const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        
        const loadHistory = () => {
            AnalysisHistoryService.loadFromLocalStorage();
            const entries = symbol 
                ? AnalysisHistoryService.get(symbol)
                : AnalysisHistoryService.getRecent(50);
            setHistory(entries);
            setIsLoading(false);
        };

        loadHistory();
    }, [symbol]);

    const add = useCallback((analysis: AnalysisResult, notes?: string) => {
        if (!symbol) return;
        AnalysisHistoryService.add(symbol, analysis, notes);
        const entries = AnalysisHistoryService.get(symbol);
        setHistory(entries);
    }, [symbol]);

    const remove = useCallback((id: string) => {
        AnalysisHistoryService.delete(id);
        const entries = symbol 
            ? AnalysisHistoryService.get(symbol)
            : AnalysisHistoryService.getRecent(50);
        setHistory(entries);
    }, [symbol]);

    const clearSymbol = useCallback(() => {
        if (!symbol) return;
        AnalysisHistoryService.clearSymbol(symbol);
        setHistory([]);
    }, [symbol]);

    const clearAll = useCallback(() => {
        AnalysisHistoryService.clearAll();
        setHistory([]);
    }, []);

    const stats = AnalysisHistoryService.getStats();

    return {
        history,
        isLoading,
        add,
        remove,
        clearSymbol,
        clearAll,
        stats
    };
}

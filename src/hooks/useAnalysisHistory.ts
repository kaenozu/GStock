'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalysisResult } from '@/types/market';
import { AnalysisHistoryService, AnalysisHistoryEntry } from '@/lib/storage/AnalysisHistoryService';

export function useAnalysisHistory(symbol?: string) {
    const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<{
        totalEntries: number;
        uniqueSymbols: string[];
        oldestEntry?: Date;
        newestEntry?: Date;
        storageSize: number;
    }>({
        totalEntries: 0,
        uniqueSymbols: [],
        oldestEntry: undefined,
        newestEntry: undefined,
        storageSize: 0
    });

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const entries = symbol
                    ? await AnalysisHistoryService.get(symbol)
                    : await AnalysisHistoryService.getRecent(50);
                setHistory(entries);

                const statsData = await AnalysisHistoryService.getStats();
                setStats(statsData);
            } catch (error) {
                console.error('[useAnalysisHistory] Failed to load history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadHistory();
    }, [symbol]);

    const add = useCallback(async (analysis: AnalysisResult, notes?: string) => {
        if (!symbol) return;
        try {
            await AnalysisHistoryService.add(symbol, analysis, notes);
            const entries = await AnalysisHistoryService.get(symbol);
            setHistory(entries);

            const statsData = await AnalysisHistoryService.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('[useAnalysisHistory] Failed to add entry:', error);
        }
    }, [symbol]);

    const remove = useCallback(async (id: number) => {
        try {
            await AnalysisHistoryService.delete(id);
            const entries = symbol
                ? await AnalysisHistoryService.get(symbol)
                : await AnalysisHistoryService.getRecent(50);
            setHistory(entries);

            const statsData = await AnalysisHistoryService.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('[useAnalysisHistory] Failed to remove entry:', error);
        }
    }, [symbol]);

    const clearSymbol = useCallback(async () => {
        if (!symbol) return;
        try {
            await AnalysisHistoryService.clearSymbol(symbol);
            setHistory([]);

            const statsData = await AnalysisHistoryService.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('[useAnalysisHistory] Failed to clear symbol:', error);
        }
    }, [symbol]);

    const clearAll = useCallback(async () => {
        try {
            await AnalysisHistoryService.clearAll();
            setHistory([]);

            const statsData = await AnalysisHistoryService.getStats();
            setStats(statsData);
        } catch (error) {
            console.error('[useAnalysisHistory] Failed to clear all:', error);
        }
    }, []);

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
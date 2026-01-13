import { useApiQuery } from '@/hooks/useApiQuery';
import { AnalysisResult } from '@/types/market';

export function useAnalysisData(symbol: string) {
    return useApiQuery<AnalysisResult>(
        ['analysis', symbol],
        () => fetch(`/api/stock?symbol=${symbol}`).then(res => res.json()),
        {
            staleTime: 120000, // 2 minutes
        }
    );
}

export function useAnalysisDataLazy(symbol: string) {
    return useApiQuery<AnalysisResult>(
        ['analysis', symbol],
        () => fetch(`/api/stock?symbol=${symbol}`).then(res => res.json()),
        {
            enabled: false, // Initially disabled
        }
    );
}
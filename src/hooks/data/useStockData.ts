import { useApiQuery } from '@/hooks/useApiQuery';
import { StockDataPoint } from '@/types/market';

export function useStockData(symbol: string) {
    return useApiQuery<StockDataPoint[]>(
        ['stock', symbol],
        () => fetch(`/api/stock?symbol=${symbol}`).then(res => res.json()),
        {
            staleTime: 60000, // 10 minutes
        }
    );
}

export function useStockDataLazy(symbol: string) {
    return useApiQuery<StockDataPoint[]>(
        ['stock', symbol],
        () => fetch(`/api/stock?symbol=${symbol}`).then(res => res.json()),
        {
            enabled: false, // Initially disabled
        }
    );
}
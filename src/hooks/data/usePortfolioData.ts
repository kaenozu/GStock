import { useApiQuery } from '@/hooks/useApiQuery';
import { PortfolioAsset } from '@/types/portfolio';

export function usePortfolioData() {
    return useApiQuery<PortfolioAsset[]>(
        ['portfolio'],
        () => fetch('/api/portfolio').then(res => res.json()),
        {
            staleTime: 300000, // 5 minutes
        }
    );
}

export function usePortfolioDataLazy() {
    return useApiQuery<PortfolioAsset[]>(
        ['portfolio'],
        () => fetch('/api/portfolio').then(res => res.json()),
        {
            enabled: false, // Initially disabled
        }
    );
}
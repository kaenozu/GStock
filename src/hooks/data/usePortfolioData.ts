import { useApiQuery } from '@/hooks/useApiQuery';
import { PortfolioPosition } from '@/types/portfolio';

export function usePortfolioData() {
    return useApiQuery<PortfolioPosition[]>(
        ['portfolio'],
        () => fetch('/api/portfolio').then(res => res.json()),
        {
            staleTime: 300000, // 5 minutes
        }
    );
}

export function usePortfolioDataLazy() {
    return useApiQuery<PortfolioPosition[]>(
        ['portfolio'],
        () => fetch('/api/portfolio').then(res => res.json()),
        {
            enabled: false, // Initially disabled
        }
    );
}
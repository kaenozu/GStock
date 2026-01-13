'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface QueryOptions {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
}

interface QueryResult<T> {
    data: T | null;
    error: string | null;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    refetch: () => Promise<void>;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();

export function useApiQuery<T>(
    queryKey: (string | number)[],
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
): QueryResult<T> {
    const {
        enabled = true,
        staleTime = 60000, // 1 minute default
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(enabled);
    
    const cacheKey = queryKey.join('-');
    const queryFnRef = useRef(queryFn);
    queryFnRef.current = queryFn;

    const fetchData = useCallback(async () => {
        if (!enabled) return;

        // Check cache
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < staleTime) {
            setData(cached.data as T);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await queryFnRef.current();
            setData(result);
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [cacheKey, enabled, staleTime]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        error,
        isLoading,
        isError: error !== null,
        isSuccess: data !== null && error === null,
        refetch: fetchData,
    };
}

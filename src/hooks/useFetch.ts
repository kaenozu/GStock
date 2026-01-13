'use client';

import { useState, useEffect } from 'react';

interface FetchState<T> {
    data: T | null;
    error: string | null;
    isLoading: boolean;
}

export function useFetch<T>(
    url: string,
    options?: RequestInit
): FetchState<T> & { refetch: () => void } {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        isLoading: true,
    });

    const fetchData = async () => {
        setState({ data: null, error: null, isLoading: true });

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setState({ data, error: null, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '不明なエラー';
            setState({ data: null, error: errorMessage, isLoading: false });
        }
    };

    useEffect(() => {
        fetchData();
    }, [url]);

    return { ...state, refetch: fetchData };
}

export function useLazyFetch<T>(
    url: string | null,
    options?: RequestInit
): FetchState<T> & { fetch: () => Promise<void> } {
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        isLoading: false,
    });

    const fetchData = async () => {
        if (!url) return;

        setState({ data: null, error: null, isLoading: true });

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setState({ data, error: null, isLoading: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '不明なエラー';
            setState({ data: null, error: errorMessage, isLoading: false });
        }
    };

    return { ...state, fetch: fetchData };
}
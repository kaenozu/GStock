'use client';

import { useQuery, useMutation as useMutationHook, useQueryClient } from '@tanstack/react-query';

interface UseApiQueryOptions {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
}

export function useApiQuery<T>(
    queryKey: string[],
    fetchFn: () => Promise<T>,
    options?: UseApiQueryOptions
) {
    return useQuery({
        queryKey,
        queryFn: fetchFn,
        enabled: options?.enabled ?? true,
        refetchInterval: options?.refetchInterval,
        staleTime: options?.staleTime ?? 60000, // 10 minutes default
    });
}

export function useLazyApiQuery<T>(
    queryKey: string[],
    fetchFn: () => Promise<T>
) {
    const query = useQuery({
        queryKey,
        queryFn: fetchFn,
        enabled: false, // Initially disabled
    });

    const fetch = () => {
        query.refetch();
    };

    return {
        ...query,
        fetch,
        isFetchedOnce: query.isFetched,
    };
}

export function useMutation<T, V>(
    mutationKey: string[],
    mutationFn: (variables: V) => Promise<T>
) {
    const queryClient = useQueryClient();

    const mutation = useMutationHook({
        mutationKey,
        mutationFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: mutationKey.slice(0, -1) });
        },
    });

    return mutation;
}
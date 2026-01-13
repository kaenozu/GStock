
import useSWR, { SWRConfiguration } from 'swr';

export interface ApiQueryOptions<T> extends SWRConfiguration {
    enabled?: boolean;
    staleTime?: number;
}

export function useApiQuery<T>(
    key: any[],
    fetcher: () => Promise<T>,
    options: ApiQueryOptions<T> = {}
) {
    const { enabled = true, staleTime, ...swrOptions } = options;

    // If not enabled, pass null as key to disable SWR
    const swrKey = enabled ? key : null;

    // Map staleTime to dedupingInterval (approximate equivalent for SWR)
    const finalOptions: SWRConfiguration = {
        ...swrOptions,
        dedupingInterval: staleTime ?? swrOptions.dedupingInterval,
        // Default config consistent with dashboard needs
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    };

    const { data, error, isLoading, mutate } = useSWR<T>(swrKey, fetcher, finalOptions);

    return {
        data,
        error,
        isLoading,
        refetch: mutate,
    };
}

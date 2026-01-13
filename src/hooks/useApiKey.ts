'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApiKeyManager, ApiKeyConfig } from '@/lib/storage/ApiKeyManager';

interface UseApiKeyResult {
    apiKeys: ApiKeyConfig;
    isLoading: boolean;
    error: string | null;
    saveApiKeys: (keys: Partial<ApiKeyConfig>) => Promise<boolean>;
    validateApiKey: (provider: 'finnhub' | 'alphaVantage', apiKey: string) => Promise<boolean>;
    hasApiKey: (provider: 'finnhub' | 'alphaVantage') => Promise<boolean>;
    clearKeys: () => void;
}

export function useApiKey(): UseApiKeyResult {
    const [apiKeys, setApiKeys] = useState<ApiKeyConfig>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        setIsLoading(true);
        try {
            const keys = await ApiKeyManager.getApiKeys();
            setApiKeys(keys);
            setError(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load API keys';
            setError(message);
            console.error('[useApiKey] Failed to load API keys:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const saveApiKeys = useCallback(async (keys: Partial<ApiKeyConfig>): Promise<boolean> => {
        try {
            const newKeys = { ...apiKeys, ...keys };
            await ApiKeyManager.saveApiKeys(newKeys);
            setApiKeys(newKeys);
            setError(null);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save API keys';
            setError(message);
            console.error('[useApiKey] Failed to save API keys:', err);
            return false;
        }
    }, [apiKeys]);

    const validateApiKey = useCallback(async (provider: 'finnhub' | 'alphaVantage', apiKey: string): Promise<boolean> => {
        try {
            const isValid = await ApiKeyManager.validateApiKey(provider, apiKey);
            if (!isValid) {
                setError(`${provider === 'finnhub' ? 'Finnhub' : 'Alpha Vantage'} APIキーが無効です`);
            } else {
                setError(null);
            }
            return isValid;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Validation failed';
            setError(message);
            console.error('[useApiKey] API key validation failed:', err);
            return false;
        }
    }, []);

    const hasApiKey = useCallback(async (provider: 'finnhub' | 'alphaVantage'): Promise<boolean> => {
        return await ApiKeyManager.hasApiKey(provider);
    }, []);

    const clearKeys = useCallback(() => {
        ApiKeyManager.clearApiKeys();
        setApiKeys({});
        setError(null);
    }, []);

    return {
        apiKeys,
        isLoading,
        error,
        saveApiKeys,
        validateApiKey,
        hasApiKey,
        clearKeys
    };
}

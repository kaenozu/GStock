const API_KEY_STORAGE_KEY = 'gstock_api_keys';

export interface ApiKeyConfig {
    finnhubApiKey?: string;
    alphaVantageApiKey?: string;
}

export class ApiKeyManager {
    static async encrypt(text: string): Promise<string> {
        if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
            return btoa(text);
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);

            const key = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            const keyData = await window.crypto.subtle.exportKey('raw', key);
            
            const result = {
                encryptedData: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                key: Array.from(new Uint8Array(keyData))
            };

            return btoa(JSON.stringify(result));
        } catch (error) {
            console.error('[ApiKeyManager] Encryption failed, using base64:', error);
            return btoa(text);
        }
    }

    static async decrypt(encryptedText: string): Promise<string> {
        if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
            return atob(encryptedText);
        }

        try {
            const data = JSON.parse(atob(encryptedText));
            
            if (!data.encryptedData || !data.iv || !data.key) {
                return atob(encryptedText);
            }

            const key = await window.crypto.subtle.importKey(
                'raw',
                new Uint8Array(data.key),
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );

            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(data.iv) },
                key,
                new Uint8Array(data.encryptedData)
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('[ApiKeyManager] Decryption failed, using base64:', error);
            try {
                return atob(encryptedText);
            } catch {
                return '';
            }
        }
    }

    static async saveApiKeys(config: ApiKeyConfig): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            const encryptedData: Record<string, string> = {};

            if (config.finnhubApiKey) {
                encryptedData.finnhubApiKey = await this.encrypt(config.finnhubApiKey);
            }
            if (config.alphaVantageApiKey) {
                encryptedData.alphaVantageApiKey = await this.encrypt(config.alphaVantageApiKey);
            }

            localStorage.setItem(API_KEY_STORAGE_KEY, JSON.stringify(encryptedData));
            console.log('[ApiKeyManager] API keys saved securely');
        } catch (error) {
            console.error('[ApiKeyManager] Failed to save API keys:', error);
        }
    }

    static async getApiKeys(): Promise<ApiKeyConfig> {
        if (typeof window === 'undefined') {
            return {};
        }

        try {
            const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
            if (!stored) {
                return {};
            }

            const encryptedData = JSON.parse(stored);
            const result: ApiKeyConfig = {};

            if (encryptedData.finnhubApiKey) {
                result.finnhubApiKey = await this.decrypt(encryptedData.finnhubApiKey);
            }
            if (encryptedData.alphaVantageApiKey) {
                result.alphaVantageApiKey = await this.decrypt(encryptedData.alphaVantageApiKey);
            }

            return result;
        } catch (error) {
            console.error('[ApiKeyManager] Failed to load API keys:', error);
            return {};
        }
    }

    static async validateApiKey(provider: 'finnhub' | 'alphaVantage', apiKey: string): Promise<boolean> {
        try {
            if (provider === 'finnhub') {
                const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`;
                const response = await fetch(url);
                const data = await response.json();
                return !data.error && response.ok;
            } else if (provider === 'alphaVantage') {
                const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`;
                const response = await fetch(url);
                const data = await response.json();
                return !data['Error Message'] && response.ok;
            }
            return false;
        } catch (error) {
            console.error('[ApiKeyManager] API key validation failed:', error);
            return false;
        }
    }

    static async hasApiKey(provider: 'finnhub' | 'alphaVantage'): Promise<boolean> {
        const keys = await this.getApiKeys();
        return !!(provider === 'finnhub' ? keys.finnhubApiKey : keys.alphaVantageApiKey);
    }

    static clearApiKeys(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        console.log('[ApiKeyManager] API keys cleared');
    }
}

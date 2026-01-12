export interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export interface CacheConfig {
    defaultTTL: number; // Time to live in milliseconds
    maxSize: number; // Maximum number of items in cache
    cleanupInterval: number; // How often to check for expired items
}

export class DataCache<T> {
    private cache: Map<string, CacheItem<T>>;
    private config: CacheConfig;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(config: Partial<CacheConfig> = {}) {
        this.cache = new Map();
        this.config = {
            defaultTTL: config.defaultTTL ?? 30 * 60 * 1000, // 30 minutes
            maxSize: config.maxSize ?? 100,
            cleanupInterval: config.cleanupInterval ?? 5 * 60 * 1000 // 5 minutes
        };

        this.startCleanup();
    }

    set(key: string, data: T, ttl?: number): void {
        const now = Date.now();
        const expiresAt = now + (ttl ?? this.config.defaultTTL);

        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt
        });

        this.enforceMaxSize();
    }

    get(key: string): T | null {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        const now = Date.now();

        if (now > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        
        if (!item) {
            return false;
        }

        const now = Date.now();

        if (now > item.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    cleanup(): number {
        const now = Date.now();
        let removed = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
                removed++;
            }
        }

        return removed;
    }

    private enforceMaxSize(): void {
        if (this.cache.size <= this.config.maxSize) {
            return;
        }

        const entries = Array.from(this.cache.entries());
        
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = this.cache.size - this.config.maxSize;
        
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    private startCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            const removed = this.cleanup();
            if (removed > 0) {
                console.log(`[DataCache] Cleaned up ${removed} expired items`);
            }
        }, this.config.cleanupInterval);
    }

    stopCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }

    getStats(): { size: number; maxSize: number; oldest?: number; newest?: number } {
        const entries = Array.from(this.cache.values());
        const timestamps = entries.map(e => e.timestamp);
        
        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            oldest: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
            newest: timestamps.length > 0 ? Math.max(...timestamps) : undefined
        };
    }

    destroy(): void {
        this.stopCleanup();
        this.clear();
    }
}

export const stockDataCache = new DataCache<any>({
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    maxSize: 50,
    cleanupInterval: 5 * 60 * 1000
});

export const analysisCache = new DataCache<any>({
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    maxSize: 100,
    cleanupInterval: 5 * 60 * 1000
});

export const backtestCache = new DataCache<any>({
    defaultTTL: 60 * 60 * 1000, // 1 hour
    maxSize: 20,
    cleanupInterval: 10 * 60 * 1000
});

const STORAGE_KEYS = {
    ANALYSIS_HISTORY: 'gstock_analysis_history',
    ALERT_SETTINGS: 'gstock_alert_settings',
    ALERT_HISTORY: 'gstock_alert_history',
    WATCHLIST: 'gstock_watchlist',
    PORTFOLIO: 'gstock_portfolio',
    CHART_SETTINGS: 'gstock_chart_settings'
};

const STORAGE_LIMITS = {
    ANALYSIS_HISTORY: 100,
    ALERT_HISTORY: 50,
    TOTAL_SIZE_MB: 5 // 5MB制限
} as const;

export interface StorageUsage {
    key: string;
    size: number;
    sizeFormatted: string;
    itemCount?: number;
}

export interface StorageStats {
    totalSize: number;
    totalSizeFormatted: string;
    usagePercentage: number;
    items: StorageUsage[];
    limitExceeded: boolean;
}

export class StorageManager {
    static async getStorageStats(): Promise<StorageStats> {
        const items: StorageUsage[] = [];
        let totalSize = 0;

        for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
            const size = this.getItemSize(storageKey);
            const itemCount = this.getItemCount(storageKey);

            if (size > 0) {
                items.push({
                    key,
                    size,
                    sizeFormatted: this.formatSize(size),
                    itemCount
                });
                totalSize += size;
            }
        }

        const limitExceeded = totalSize > STORAGE_LIMITS.TOTAL_SIZE_MB * 1024 * 1024;
        const usagePercentage = Math.min(
            (totalSize / (STORAGE_LIMITS.TOTAL_SIZE_MB * 1024 * 1024)) * 100,
            100
        );

        return {
            totalSize,
            totalSizeFormatted: this.formatSize(totalSize),
            usagePercentage,
            items,
            limitExceeded
        };
    }

    static getItemSize(key: string): number {
        if (typeof window === 'undefined') return 0;

        try {
            const item = localStorage.getItem(key);
            if (!item) return 0;

            return new Blob([item]).size;
        } catch {
            return 0;
        }
    }

    static getItemCount(key: string): number | undefined {
        if (typeof window === 'undefined') return undefined;

        try {
            const item = localStorage.getItem(key);
            if (!item) return 0;

            const data = JSON.parse(item);

            if (Array.isArray(data)) {
                return data.length;
            }

            if (typeof data === 'object' && data !== null) {
                return Object.keys(data).length;
            }

            return 1;
        } catch {
            return undefined;
        }
    }

    static clearOldestItems(key: string, keepCount: number): boolean {
        if (typeof window === 'undefined') return false;

        try {
            const item = localStorage.getItem(key);
            if (!item) return false;

            const data = JSON.parse(item);

            if (!Array.isArray(data)) return false;

            if (data.length <= keepCount) return true;

            const sortedData = data.sort((a: any, b: any) => {
                const aTime = a.timestamp || a.time || 0;
                const bTime = b.timestamp || b.time || 0;
                return aTime - bTime;
            });

            const trimmedData = sortedData.slice(keepCount);
            localStorage.setItem(key, JSON.stringify(trimmedData));

            return true;
        } catch (error) {
            console.error('[StorageManager] Failed to clear oldest items:', error);
            return false;
        }
    }

    static cleanupOldEntries(): void {
        this.clearOldestItems(STORAGE_KEYS.ANALYSIS_HISTORY, STORAGE_LIMITS.ANALYSIS_HISTORY);
        this.clearOldestItems(STORAGE_KEYS.ALERT_HISTORY, STORAGE_LIMITS.ALERT_HISTORY);
    }

    static async cleanupIfNeededAsync(): Promise<boolean> {
        const stats = await this.getStorageStats();

        if (stats.limitExceeded) {
            console.warn('[StorageManager] Storage limit exceeded, cleaning up...');
            this.cleanupOldEntries();
            return true;
        }

        return false;
    }

    static clearAllData(): void {
        if (typeof window === 'undefined') return;

        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('[StorageManager] All data cleared');
    }

    static clearItem(key: string): void {
        if (typeof window === 'undefined') return;

        localStorage.removeItem(key);
    }

    static exportAllData(): string {
        if (typeof window === 'undefined') return '';

        const data: Record<string, any> = {};

        for (const [name, storageKey] of Object.entries(STORAGE_KEYS)) {
            const item = localStorage.getItem(storageKey);
            if (item) {
                data[name] = JSON.parse(item);
            }
        }

        return JSON.stringify(data, null, 2);
    }

    static importAllData(json: string): boolean {
        if (typeof window === 'undefined') return false;

        try {
            const data = JSON.parse(json);

            for (const [name, value] of Object.entries(data)) {
                const storageKey = (STORAGE_KEYS as any)[name];
                if (storageKey && value) {
                    localStorage.setItem(storageKey, JSON.stringify(value));
                }
            }

            console.log('[StorageManager] Data imported successfully');
            return true;
        } catch (error) {
            console.error('[StorageManager] Failed to import data:', error);
            return false;
        }
    }

    private static formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    static checkStorageAvailable(): boolean {
        if (typeof window === 'undefined') return false;

        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    static getStorageQuota(): Promise<{
        usage: number;
        quota: number;
        percentage: number;
    }> {
        if (typeof window === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
            return Promise.resolve({
                usage: 0,
                quota: 0,
                percentage: 0
            });
        }

        return navigator.storage.estimate().then(estimate => {
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            const percentage = quota > 0 ? (usage / quota) * 100 : 0;

            return { usage, quota, percentage };
        });
    }
}

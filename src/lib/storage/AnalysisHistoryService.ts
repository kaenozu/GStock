import { AnalysisResult } from '@/types/market';
import { indexedDBCache } from '@/lib/cache/IndexedDBCache';

const MAX_HISTORY_SIZE = 500;

export interface AnalysisHistoryEntry {
    id: number;
    symbol: string;
    analysis: AnalysisResult;
    timestamp: number;
    notes?: string;
}

export class AnalysisHistoryService {
    private static isInitialized = false;
    private static inMemoryCache: Map<number, AnalysisHistoryEntry> = new Map();
    private static nextId = 1;

    private static async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await indexedDBCache.init();
            await this.loadFromIndexedDB();
            this.isInitialized = true;
        }
    }

    private static async loadFromIndexedDB(): Promise<void> {
        try {
            const entries = await indexedDBCache.getAll('analysis-history');
            this.inMemoryCache.clear();
            let maxId = 0;
            entries.forEach((entry: AnalysisHistoryEntry) => {
                if (entry.id > maxId) {
                    maxId = entry.id;
                }
                this.inMemoryCache.set(entry.id, entry);
            });
            this.nextId = maxId + 1;
        } catch (error) {
            console.error('[AnalysisHistory] Failed to load from IndexedDB:', error);
        }
    }

    static async add(symbol: string, analysis: AnalysisResult, notes?: string): Promise<void> {
        await this.ensureInitialized();

        const id = this.nextId++;
        const entry: AnalysisHistoryEntry = {
            id,
            symbol,
            analysis,
            timestamp: Date.now(),
            notes
        };

        await indexedDBCache.set('analysis-history', id.toString(), entry);
        this.inMemoryCache.set(id, entry);

        await this.enforceMaxSize();
    }

    static async get(symbol: string, limit?: number): Promise<AnalysisHistoryEntry[]> {
        await this.ensureInitialized();

        const entries = Array.from(this.inMemoryCache.values())
            .filter(entry => entry.symbol === symbol)
            .sort((a, b) => b.timestamp - a.timestamp);

        return limit ? entries.slice(0, limit) : entries;
    }

    static async getAll(limit?: number): Promise<AnalysisHistoryEntry[]> {
        await this.ensureInitialized();

        const entries = Array.from(this.inMemoryCache.values())
            .sort((a, b) => b.timestamp - a.timestamp);

        return limit ? entries.slice(0, limit) : entries;
    }

    static async getRecent(limit: number = 20): Promise<AnalysisHistoryEntry[]> {
        return this.getAll(limit);
    }

    static async delete(id: number): Promise<void> {
        await this.ensureInitialized();

        await indexedDBCache.delete('analysis-history', id.toString());
        this.inMemoryCache.delete(id);
    }

    static async clearSymbol(symbol: string): Promise<void> {
        await this.ensureInitialized();

        for (const [id, entry] of this.inMemoryCache.entries()) {
            if (entry.symbol === symbol) {
                await indexedDBCache.delete('analysis-history', id.toString());
                this.inMemoryCache.delete(id);
            }
        }
    }

    static async clearAll(): Promise<void> {
        await this.ensureInitialized();

        await indexedDBCache.clear('analysis-history');
        this.inMemoryCache.clear();
        this.nextId = 1;
    }

    private static async enforceMaxSize(): Promise<void> {
        if (this.inMemoryCache.size <= MAX_HISTORY_SIZE) return;

        const entries = Array.from(this.inMemoryCache.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        const toRemove = this.inMemoryCache.size - MAX_HISTORY_SIZE;

        for (let i = 0; i < toRemove; i++) {
            const entry = entries[i];
            await indexedDBCache.delete('analysis-history', entry.id.toString());
            this.inMemoryCache.delete(entry.id);
        }
    }

    static async getStats(): Promise<{
        totalEntries: number;
        uniqueSymbols: string[];
        oldestEntry?: Date;
        newestEntry?: Date;
        storageSize: number;
    }> {
        await this.ensureInitialized();

        const entries = Array.from(this.inMemoryCache.values());
        const uniqueSymbols = new Set(entries.map(e => e.symbol));
        const timestamps = entries.map(e => e.timestamp);

        const dbStats = await indexedDBCache.getStats();

        let storageSize = 0;
        if (dbStats['analysis-history']) {
            storageSize = dbStats['analysis-history'] * 1000;
        }

        return {
            totalEntries: entries.length,
            uniqueSymbols: Array.from(uniqueSymbols),
            oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
            newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
            storageSize
        };
    }

    static async exportToJson(): Promise<string> {
        await this.ensureInitialized();

        const entries = Array.from(this.inMemoryCache.values())
            .sort((a, b) => b.timestamp - a.timestamp);

        return JSON.stringify(entries, null, 2);
    }

    static async importFromJson(json: string): Promise<boolean> {
        try {
            await this.ensureInitialized();

            const entries: AnalysisHistoryEntry[] = JSON.parse(json);

            if (!Array.isArray(entries)) {
                throw new Error('Invalid JSON format');
            }

            for (const entry of entries) {
                if (entry.symbol && entry.analysis) {
                    const newEntry: AnalysisHistoryEntry = {
                        id: this.nextId++,
                        symbol: entry.symbol,
                        analysis: entry.analysis,
                        timestamp: entry.timestamp || Date.now(),
                        notes: entry.notes
                    };
                    await indexedDBCache.set('analysis-history', newEntry.id.toString(), newEntry);
                    this.inMemoryCache.set(newEntry.id, newEntry);
                }
            }

            await this.enforceMaxSize();

            return true;
        } catch (error) {
            console.error('[AnalysisHistory] Failed to import JSON:', error);
            return false;
        }
    }
}
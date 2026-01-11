import { AnalysisResult } from '@/types/market';

const HISTORY_KEY = 'gstock_analysis_history';
const MAX_HISTORY_SIZE = 100;

export interface AnalysisHistoryEntry {
    id: string;
    symbol: string;
    analysis: AnalysisResult;
    timestamp: number;
    notes?: string;
}

export class AnalysisHistoryService {
    private static history: Map<string, AnalysisHistoryEntry> = new Map();

    static saveToLocalStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const entries = Array.from(this.history.values());
            const sortedEntries = entries
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, MAX_HISTORY_SIZE);

            localStorage.setItem(HISTORY_KEY, JSON.stringify(sortedEntries));
        } catch (error) {
            console.error('[AnalysisHistory] Failed to save to localStorage:', error);
        }
    }

    static loadFromLocalStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (!stored) return;

            const entries: AnalysisHistoryEntry[] = JSON.parse(stored);
            
            this.history.clear();
            entries.forEach(entry => {
                this.history.set(entry.id, entry);
            });
        } catch (error) {
            console.error('[AnalysisHistory] Failed to load from localStorage:', error);
        }
    }

    static add(symbol: string, analysis: AnalysisResult, notes?: string): void {
        const id = `${symbol}-${Date.now()}`;
        
        const entry: AnalysisHistoryEntry = {
            id,
            symbol,
            analysis,
            timestamp: Date.now(),
            notes
        };

        this.history.set(id, entry);
        this.enforceMaxSize();
        this.saveToLocalStorage();
    }

    static get(symbol: string, limit?: number): AnalysisHistoryEntry[] {
        const entries = Array.from(this.history.values())
            .filter(entry => entry.symbol === symbol)
            .sort((a, b) => b.timestamp - a.timestamp);

        return limit ? entries.slice(0, limit) : entries;
    }

    static getAll(limit?: number): AnalysisHistoryEntry[] {
        const entries = Array.from(this.history.values())
            .sort((a, b) => b.timestamp - a.timestamp);

        return limit ? entries.slice(0, limit) : entries;
    }

    static getRecent(limit: number = 20): AnalysisHistoryEntry[] {
        return this.getAll(limit);
    }

    static delete(id: string): void {
        this.history.delete(id);
        this.saveToLocalStorage();
    }

    static clearSymbol(symbol: string): void {
        for (const [id, entry] of this.history.entries()) {
            if (entry.symbol === symbol) {
                this.history.delete(id);
            }
        }
        this.saveToLocalStorage();
    }

    static clearAll(): void {
        this.history.clear();
        if (typeof window !== 'undefined') {
            localStorage.removeItem(HISTORY_KEY);
        }
    }

    private static enforceMaxSize(): void {
        if (this.history.size <= MAX_HISTORY_SIZE) return;

        const entries = Array.from(this.history.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        const toRemove = this.history.size - MAX_HISTORY_SIZE;
        
        for (let i = 0; i < toRemove; i++) {
            this.history.delete(entries[i].id);
        }
    }

    static getStats(): {
        totalEntries: number;
        uniqueSymbols: string[];
        oldestEntry?: Date;
        newestEntry?: Date;
        storageSize: number;
    } {
        const entries = Array.from(this.history.values());
        const uniqueSymbols = new Set(entries.map(e => e.symbol));
        const timestamps = entries.map(e => e.timestamp);

        let storageSize = 0;
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(HISTORY_KEY);
            storageSize = stored ? new Blob([stored]).size : 0;
        }

        return {
            totalEntries: entries.length,
            uniqueSymbols: Array.from(uniqueSymbols),
            oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined,
            newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined,
            storageSize
        };
    }

    static exportToJson(): string {
        const entries = Array.from(this.history.values())
            .sort((a, b) => b.timestamp - a.timestamp);
        
        return JSON.stringify(entries, null, 2);
    }

    static importFromJson(json: string): boolean {
        try {
            const entries: AnalysisHistoryEntry[] = JSON.parse(json);
            
            if (!Array.isArray(entries)) {
                throw new Error('Invalid JSON format');
            }

            entries.forEach(entry => {
                if (entry.id && entry.symbol && entry.analysis) {
                    this.history.set(entry.id, entry);
                }
            });

            this.enforceMaxSize();
            this.saveToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('[AnalysisHistory] Failed to import JSON:', error);
            return false;
        }
    }
}

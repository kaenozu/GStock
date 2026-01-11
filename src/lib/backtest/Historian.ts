import fs from 'fs';
import path from 'path';
import { StockDataPoint } from '@/types/market';

const CACHE_DIR = path.join(process.cwd(), 'data', 'history_cache');

export type HistoricalPeriod = '1y' | '2y' | '5y';

export class Historian {

    constructor() {
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
    }

    /**
     * Retrieves historical stock data.
     * Checks cache first. If older than 24h, re-fetches.
     */
    public async getHistory(symbol: string, period: HistoricalPeriod = '1y'): Promise<StockDataPoint[]> {
        const cacheFile = path.join(CACHE_DIR, `${symbol}_${period}.json`);

        // 1. Check Cache
        if (fs.existsSync(cacheFile)) {
            const stats = fs.statSync(cacheFile);
            const now = new Date().getTime();
            const mtime = new Date(stats.mtime).getTime();

            // Valid for 24 hours
            if ((now - mtime) < 24 * 60 * 60 * 1000) {
                const raw = fs.readFileSync(cacheFile, 'utf-8');
                return JSON.parse(raw);
            }
        }

        // 2. Fetch from API
        const data = await this.fetchFromYahoo(symbol, period);

        if (data.length > 0) {
            fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
        }

        return data;
    }

    private async fetchFromYahoo(symbol: string, range: string): Promise<StockDataPoint[]> {
        // Mapping simplified range to Yahoo range if needed, here '1y', '2y', '5y' match.
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`;

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Yahoo API: ${response.status} ${text}`);
            }

            const json = await response.json();
            const result = json.chart?.result?.[0];

            if (!result) throw new Error("Yahoo API: Empty result");

            const timestamps = result.timestamp || [];
            const quote = result.indicators.quote[0];

            const formatted: StockDataPoint[] = timestamps.map((ts: number, i: number) => {
                if (!quote.close[i]) return null;
                return {
                    time: new Date(ts * 1000).toISOString().split('T')[0],
                    open: this.round(quote.open[i]),
                    high: this.round(quote.high[i]),
                    low: this.round(quote.low[i]),
                    close: this.round(quote.close[i]),
                    volume: quote.volume[i] || 0
                };
            }).filter((d: any) => d !== null);

            return formatted.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        } catch (error) {
            console.error(`[Historian] Fetch Failed for ${symbol}:`, error);
            throw error;
        }
    }

    private round(num: number): number {
        return Math.round(num * 100) / 100;
    }

    public cleanCache() {
        if (fs.existsSync(CACHE_DIR)) {
            const files = fs.readdirSync(CACHE_DIR);
            files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
        }
    }
}

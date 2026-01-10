import { StockDataPoint } from '@/types/market';
import { StockProvider } from './StockProvider';

export class YahooProvider implements StockProvider {
    name = 'Yahoo';

    async fetchData(symbol: string): Promise<StockDataPoint[]> {
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=6mo&interval=1d`;

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Yahoo Error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) return [];

        const quote = result.indicators.quote[0];
        const timestamps = result.timestamp;

        if (!timestamps || !quote) return [];

        return timestamps.map((ts: number, i: number) => {
            if (quote.close[i] === null || quote.open[i] === null) return null;
            return {
                time: new Date(ts * 1000).toISOString().split('T')[0],
                open: this.round(quote.open[i]),
                high: this.round(quote.high[i]),
                low: this.round(quote.low[i]),
                close: this.round(quote.close[i]),
            };
        }).filter((x): x is StockDataPoint => x !== null);
    }

    async fetchQuote(symbol: string): Promise<number> {
        // Fallback: Use fetchData and take last close
        const data = await this.fetchData(symbol);
        if (data.length === 0) return 0;
        return data[data.length - 1].close;
    }

    private round(num: number): number {
        return Math.round(num * 100) / 100;
    }
}

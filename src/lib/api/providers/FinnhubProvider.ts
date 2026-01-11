import { StockDataPoint } from '@/types/market';
import { StockProvider } from './StockProvider';

export interface CompanyFinancials {
    symbol: string;
    pe: number | null;           // Price-to-Earnings
    eps: number | null;          // Earnings per Share (TTM)
    epsGrowth: number | null;    // EPS Growth (YoY %)
    roe: number | null;          // Return on Equity
    revenueGrowth: number | null; // Revenue Growth (YoY %)
    marketCap: number | null;    // Market Capitalization
    dividendYield: number | null;
    beta: number | null;
    _52wHigh: number | null;
    _52wLow: number | null;
}

export class FinnhubProvider implements StockProvider {
    name = 'Finnhub';
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.FINNHUB_API_KEY || '';
    }

    async fetchData(symbol: string): Promise<StockDataPoint[]> {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (180 * 24 * 60 * 60); // 6 months

        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Finnhub Error: ${response.status}`);
        }

        const data = await response.json();
        if (data.s === 'no_data') return [];

        return data.t.map((ts: number, i: number) => ({
            time: new Date(ts * 1000).toISOString().split('T')[0],
            open: this.round(data.o[i]),
            high: this.round(data.h[i]),
            low: this.round(data.l[i]),
            close: this.round(data.c[i]),
            volume: data.v[i]
        }));
    }

    async fetchQuote(symbol: string): Promise<number> {
        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Finnhub Quote Error: ${response.status}`);
        const data = await response.json();
        return data.c;
    }

    async fetchFinancials(symbol: string): Promise<CompanyFinancials> {
        const url = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Finnhub Financials Error: ${response.status}`);
        const data = await response.json();

        const m = data.metric || {};
        return {
            symbol,
            pe: m.peBasicExclExtraTTM ?? null,
            eps: m.epsBasicExclExtraItemsTTM ?? null,
            epsGrowth: m.epsGrowth5Y ?? null,
            roe: m.roeTTM ?? null,
            revenueGrowth: m.revenueGrowth5Y ?? null,
            marketCap: m.marketCapitalization ?? null,
            dividendYield: m.dividendYieldIndicatedAnnual ?? null,
            beta: m.beta ?? null,
            _52wHigh: m['52WeekHigh'] ?? null,
            _52wLow: m['52WeekLow'] ?? null,
        };
    }

    private round(num: number): number {
        return Math.round(num * 100) / 100;
    }

    async fetchEarningsCalendar(symbol: string): Promise<EarningsEvent[]> {
        // Get earnings for the next 3 months
        const from = new Date().toISOString().split('T')[0];
        const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const url = `https://finnhub.io/api/v1/calendar/earnings?symbol=${symbol}&from=${from}&to=${to}&token=${this.apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Finnhub Earnings Error: ${response.status}`);

            const data = await response.json();
            const events = data.earningsCalendar || [];

            return events.map((e: FinnhubEarningsResponse) => ({
                symbol: e.symbol,
                date: e.date,
                epsEstimate: e.epsEstimate ?? null,
                epsActual: e.epsActual ?? null,
                revenueEstimate: e.revenueEstimate ?? null,
                revenueActual: e.revenueActual ?? null,
                hour: e.hour || 'bmo', // before market open / after market close
            }));
        } catch (error) {
            console.error(`[Finnhub] Earnings calendar error for ${symbol}:`, error);
            return [];
        }
    }
}

// Types for Earnings
export interface EarningsEvent {
    symbol: string;
    date: string;
    epsEstimate: number | null;
    epsActual: number | null;
    revenueEstimate: number | null;
    revenueActual: number | null;
    hour: 'bmo' | 'amc' | 'dmh'; // before market open, after market close, during market hours
}

interface FinnhubEarningsResponse {
    symbol: string;
    date: string;
    epsEstimate?: number;
    epsActual?: number;
    revenueEstimate?: number;
    revenueActual?: number;
    hour?: string;
}

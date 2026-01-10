import { StockDataPoint, EarningsEvent, EarningsData } from '@/types/market';
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

    async fetchEarnings(symbol: string): Promise<EarningsData> {
        // Fetch earnings calendar
        const calendarUrl = `https://finnhub.io/api/v1/calendar/earnings?symbol=${symbol}&token=${this.apiKey}`;
        const calendarRes = await fetch(calendarUrl);
        if (!calendarRes.ok) throw new Error(`Finnhub Earnings Error: ${calendarRes.status}`);
        const calendarData = await calendarRes.json();

        // Fetch historical earnings
        const historyUrl = `https://finnhub.io/api/v1/stock/earnings?symbol=${symbol}&token=${this.apiKey}`;
        const historyRes = await fetch(historyUrl);
        if (!historyRes.ok) throw new Error(`Finnhub Earnings History Error: ${historyRes.status}`);
        const historyData = await historyRes.json();

        // Parse next earnings date from calendar
        let nextEarningsDate: string | null = null;
        if (calendarData.earningsCalendar && calendarData.earningsCalendar.length > 0) {
            const upcoming = calendarData.earningsCalendar.find(
                (e: { date: string }) => new Date(e.date) >= new Date()
            );
            if (upcoming) {
                nextEarningsDate = upcoming.date;
            }
        }

        // Parse historical earnings
        const history: EarningsEvent[] = (historyData || []).map((e: {
            period: string;
            actual: number | null;
            estimate: number | null;
            surprisePercent: number | null;
            revenueActual?: number | null;
            revenueEstimate?: number | null;
        }) => ({
            date: e.period,
            epsActual: e.actual,
            epsEstimate: e.estimate,
            surprise: e.surprisePercent,
            revenueActual: e.revenueActual ?? null,
            revenueEstimate: e.revenueEstimate ?? null,
            period: this.formatPeriod(e.period),
        })).slice(0, 8);

        return {
            symbol,
            nextEarningsDate,
            history,
        };
    }

    private formatPeriod(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            const q = Math.ceil((d.getMonth() + 1) / 3);
            return `Q${q} ${d.getFullYear()}`;
        } catch {
            return dateStr;
        }
    }
}

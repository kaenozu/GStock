import { StockDataPoint, InsiderSentimentData } from '@/types/market';

export interface StockProvider {
    name: string;
    fetchData(symbol: string): Promise<StockDataPoint[]>;
    fetchQuote(symbol: string): Promise<number>; // Current Price
    fetchInsiderSentiment?(symbol: string): Promise<InsiderSentimentData[]>;
}

export interface HistoricalProvider extends StockProvider {
    fetchHistorical(symbol: string, range: string): Promise<StockDataPoint[]>;
}

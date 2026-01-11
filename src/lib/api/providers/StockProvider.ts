import { StockDataPoint } from '@/types/market';

export interface StockProvider {
    name: string;
    fetchData(symbol: string): Promise<StockDataPoint[]>;
    fetchQuote(symbol: string): Promise<number>; // Current Price
    isAvailable?: () => Promise<boolean>; // Check if provider is available
}

export interface HistoricalProvider extends StockProvider {
    fetchHistorical(symbol: string, range: string): Promise<StockDataPoint[]>;
}

export interface ProviderConfig {
    priority: number; // Lower is higher priority
    enabled: boolean;
}

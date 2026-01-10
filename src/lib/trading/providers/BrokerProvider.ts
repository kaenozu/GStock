import { Portfolio, Trade } from '../types';

export interface BrokerProvider {
    name: string;
    getPortfolio(): Promise<Portfolio>;
    executeTrade(symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, reason: string): Promise<Trade>;
}

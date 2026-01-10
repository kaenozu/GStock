import { Portfolio, Trade, TradeRequest } from '../types';
import { BrokerProvider } from './BrokerProvider';
import { PaperTradingEngine } from '../PaperTrader';

export class InternalPaperBroker implements BrokerProvider {
    name = 'Internal PaperAccount';
    private engine: PaperTradingEngine;

    constructor(engine: PaperTradingEngine) {
        this.engine = engine;
    }

    async getPortfolio(): Promise<Portfolio> {
        return this.engine.getPortfolio();
    }

    async executeTrade(symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, reason: string): Promise<Trade> {
        const req: TradeRequest = { symbol, side, quantity, price, reason };
        const result = this.engine.executeTrade(req);
        if (!result.success || !result.trade) {
            throw new Error(result.message);
        }
        return result.trade;
    }
}

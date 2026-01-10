import { Portfolio, Trade, Position } from '../types';
import { BrokerProvider } from './BrokerProvider';

export class AlpacaBroker implements BrokerProvider {
    name = 'Alpaca (Paper)';
    private apiKey: string;
    private secretKey: string;
    private baseUrl: string = 'https://paper-api.alpaca.markets';

    constructor() {
        this.apiKey = process.env.ALPACA_API_KEY || '';
        this.secretKey = process.env.ALPACA_SECRET_KEY || '';
    }

    private getHeaders() {
        return {
            'APCA-API-KEY-ID': this.apiKey,
            'APCA-API-SECRET-KEY': this.secretKey,
            'Content-Type': 'application/json'
        };
    }

    async getPortfolio(): Promise<Portfolio> {
        if (!this.apiKey) {
            throw new Error("Alpaca API Key not configured. Check .env.local");
        }

        const [accRes, posRes] = await Promise.all([
            fetch(`${this.baseUrl}/v2/account`, { headers: this.getHeaders() }),
            fetch(`${this.baseUrl}/v2/positions`, { headers: this.getHeaders() })
        ]);

        if (!accRes.ok) throw new Error(`Alpaca Account Error: ${accRes.status}`);
        if (!posRes.ok) throw new Error(`Alpaca Positions Error: ${posRes.status}`);

        const account = await accRes.json();
        const alpacaPositions = await posRes.json();

        const positions: Position[] = alpacaPositions.map((p: any) => ({
            symbol: p.symbol,
            quantity: Number(p.qty),
            averagePrice: Number(p.avg_entry_price)
        }));

        return {
            cash: Number(account.cash),
            equity: Number(account.equity),
            initialHash: INITIAL_INVESTMENT, // Define somewhere or ignore
            positions,
            trades: [], // Alpaca doesn't return full trade history in one go like this
            lastUpdated: new Date().toISOString()
        };
    }

    async executeTrade(symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, reason: string): Promise<Trade> {
        const url = `${this.baseUrl}/v2/orders`;
        const body = {
            symbol: symbol,
            qty: String(quantity),
            side: side.toLowerCase(),
            type: 'market',
            time_in_force: 'gtc'
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Alpaca Order Error: ${err.message || res.status}`);
        }

        const order = await res.json();

        return {
            id: order.id,
            timestamp: order.created_at,
            symbol: symbol,
            side: side,
            quantity: quantity,
            price: price, // Alpaca market order price is finalized later
            total: price * quantity,
            reason: reason
        };
    }
}

const INITIAL_INVESTMENT = 1000000;

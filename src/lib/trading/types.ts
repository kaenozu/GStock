export interface Position {
    symbol: string;
    quantity: number;
    averagePrice: number;
    currentPrice?: number; // For display
    unrealizedPnL?: number; // For display
}

export interface Trade {
    id: string;
    timestamp: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    total: number;
    reason: string; // e.g. "Council Consensus: BULLISH"
}

export interface Portfolio {
    cash: number;
    equity: number; // Cash + Holdings Value
    initialHash: number; // To track total PnL
    positions: Position[];
    trades: Trade[];
    lastUpdated: string;
}

export interface TradeRequest {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity?: number; // If omitted, calculate based on risk management? For now, fixed.
    price: number; // Current market price
    reason: string;
}

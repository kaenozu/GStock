import { StockDataPoint, MarketRegime, TradeSentiment } from '@/types/market';

export interface AgentResult {
    name: string;
    role: Agent['role'];
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    sentiment: TradeSentiment;
}

export interface Agent {
    id: string;
    name: string;
    role: 'CHAIRMAN' | 'TREND' | 'REVERSAL' | 'VOLATILE' | 'VOLUME' | 'FUNDAMENTAL' | 'SENTIMENT' | 'MACRO' | 'OPTION';

    /**
     * Analyze market data and return an opinion
     */
    analyze(data: StockDataPoint[], marketRegime?: MarketRegime): AgentResult;
}

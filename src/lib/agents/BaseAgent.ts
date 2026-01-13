import { Agent, AgentResult, AgentRole } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';

/**
 * Abstract BaseAgent class
 * Provides common functionality for all agents
 */
export abstract class BaseAgent implements Agent {
    abstract id: string;
    abstract name: string;
    abstract role: AgentRole;

    /**
     * Main analysis method to be implemented by child agents
     */
    abstract analyze(data: StockDataPoint[], regime?: MarketRegime): AgentResult;

    /**
     * Helper to create a neutral result (e.g., insufficient data)
     */
    protected neutralResult(reason: string): AgentResult {
        return {
            name: this.name,
            role: this.role,
            signal: 'HOLD',
            confidence: 0,
            reason: reason,
            sentiment: 'NEUTRAL'
        };
    }

    /**
     * Helper to create a result
     */
    protected createResult(
        signal: 'BUY' | 'SELL' | 'HOLD',
        confidence: number,
        reason: string,
        sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    ): AgentResult {
        return {
            name: this.name,
            role: this.role,
            signal,
            confidence: Math.min(Math.max(confidence, 0), 100), // Clamp 0-100
            reason,
            sentiment
        };
    }

    /**
     * Helper to check for sufficient data
     */
    protected hasInsufficientData(data: StockDataPoint[], minLength: number = 50): boolean {
        return !data || data.length < minLength;
    }
}

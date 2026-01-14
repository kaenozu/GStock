import { BaseAgent } from './BaseAgent';
import { AgentResult, AgentRole } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { ATR } from 'technicalindicators';

export class VolatilityAgent extends BaseAgent {
    id = 'volatility_agent';
    name = 'Hunter (Volatility)';
    role: AgentRole = 'VOLATILE';

    analyze(data: StockDataPoint[], regime?: MarketRegime): AgentResult {
        if (this.hasInsufficientData(data, 50)) {
            return this.neutralResult("Insufficient data");
        }

        const closingPrices = data.map((d) => d.close);
        const highPrices = data.map(d => d.high);
        const lowPrices = data.map(d => d.low);
        const lastPrice = closingPrices[closingPrices.length - 1];

        const atr = ATR.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 });

        const lastATR = atr[atr.length - 1];

        let score = 0;
        const reasons: string[] = [];

        // Logic: Breakout Hunter

        // 1. Squeeze detection
        if (regime === 'SQUEEZE') {
            // In squeeze, we HOLD and wait.
            return this.createResult(
                'HOLD',
                50,
                "Squeeze Active - Waiting for breakout",
                'NEUTRAL'
            );
        }

        // 2. High Volatility (Breakout?)
        const atrPercent = (lastATR / lastPrice) * 100;
        if (atrPercent > 2.0 && regime !== 'SIDEWAYS') {
            // Volatility is expanding. Check direction.
            if (regime === 'BULL_TREND') {
                score += 40;
                reasons.push(`High Volatility Breakout (Up)`);
            } else if (regime === 'BEAR_TREND') {
                score -= 40;
                reasons.push(`High Volatility Breakout (Down)`);
            }
        } else {
            reasons.push("Low Volatility");
        }

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        const confidence = Math.min(Math.abs(score), 100);

        if (score >= 40) signal = 'BUY';
        else if (score <= -40) signal = 'SELL';

        return this.createResult(
            signal,
            confidence,
            reasons.join(", ") || "Market Dormant",
            score >= 0 ? 'BULLISH' : 'BEARISH'
        );
    }
}


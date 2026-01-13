import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { ATR } from 'technicalindicators';

export class VolatilityAgent implements Agent {
    id = 'volatility_agent';
    name = 'Hunter (Volatility)';
    role: Agent['role'] = 'VOLATILE';

    analyze(data: StockDataPoint[], regime?: MarketRegime): AgentResult {
        if (data.length < 50) return this.neutralResult("Insufficient data");

        const closingPrices = data.map((d) => d.close);
        const highPrices = data.map(d => d.high);
        const lowPrices = data.map(d => d.low);
        const lastPrice = closingPrices[closingPrices.length - 1];

        const atr = ATR.calculate({ high: highPrices, low: lowPrices, close: closingPrices, period: 14 });
        // Note: Bollinger Bands calculation available for squeeze detection if needed
        // const bb = BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 });

        const lastATR = atr[atr.length - 1];

        let score = 0;
        const reasons: string[] = [];

        // Logic: Breakout Hunter

        // 1. Squeeze detection
        // Note: bandWidth could be used for detailed analysis but regime detection is sufficient
        // const bandWidth = (lastBB.upper - lastBB.lower) / lastPrice;

        if (regime === 'SQUEEZE') {
            // In squeeze, we HOLD and wait.
            return {
                name: this.name,
                role: this.role,
                signal: 'HOLD',
                confidence: 50,
                reason: "Squeeze Active - Waiting for breakout",
                sentiment: 'NEUTRAL'
            };
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
        if (score >= 40) signal = 'BUY';
        else if (score <= -40) signal = 'SELL';

        return {
            name: this.name,
            role: this.role,
            signal,
            confidence: Math.min(Math.abs(score), 100),
            reason: reasons.join(", ") || "Market Dormant",
            sentiment: score >= 0 ? 'BULLISH' : 'BEARISH'
        };
    }

    private neutralResult(reason: string): AgentResult {
        return {
            name: this.name,
            role: this.role,
            signal: 'HOLD',
            confidence: 0,
            reason,
            sentiment: 'NEUTRAL'
        };
    }
}

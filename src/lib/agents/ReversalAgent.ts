import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { RSI, BollingerBands } from 'technicalindicators';

export class ReversalAgent implements Agent {
    id = 'reversal_agent';
    name = 'Contra (Reversal)';
    role: Agent['role'] = 'REVERSAL';

    analyze(data: StockDataPoint[], _regime?: MarketRegime): AgentResult {
        if (data.length < 50) return this.neutralResult("Insufficient data");

        const closingPrices = data.map((d) => d.close);
        const lastPrice = closingPrices[closingPrices.length - 1];

        const rsi = RSI.calculate({ period: 14, values: closingPrices });
        const bb = BollingerBands.calculate({ period: 20, values: closingPrices, stdDev: 2 });

        const lastRSI = rsi[rsi.length - 1];
        const lastBB = bb[bb.length - 1];

        let score = 0;
        const reasons: string[] = [];

        // Logic: Contrarian / Mean Reversion

        // RSI Extremes
        if (lastRSI < 30) {
            score += 50;
            reasons.push(`RSI Oversold (${Math.round(lastRSI)})`);
        } else if (lastRSI > 70) {
            score -= 50;
            reasons.push(`RSI Overbought (${Math.round(lastRSI)})`);
        }

        // Bollinger Band Reversion
        if (lastPrice < lastBB.lower) {
            score += 30;
            reasons.push("Below Lower Band");
        } else if (lastPrice > lastBB.upper) {
            score -= 30;
            reasons.push("Above Upper Band");
        }

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

        // Reversal agents are aggressive but risky
        if (score >= 40) signal = 'BUY';
        else if (score <= -40) signal = 'SELL';

        return {
            name: this.name,
            role: this.role,
            signal,
            confidence: Math.min(Math.abs(score), 100),
            reason: reasons.join(", ") || "No extremes detected",
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

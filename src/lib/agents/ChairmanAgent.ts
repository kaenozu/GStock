import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { SMA, RSI } from 'technicalindicators';

export class ChairmanAgent implements Agent {
    id = 'chairman';
    name = 'Alpha (Chairman)';
    role: Agent['role'] = 'CHAIRMAN';

    analyze(data: StockDataPoint[], regime?: MarketRegime): AgentResult {
        if (data.length < 50) return this.neutralResult("Insufficient data");

        // Calculate standard indicators
        const closingPrices = data.map((d) => d.close);
        const lastPrice = closingPrices[closingPrices.length - 1];

        const sma20 = SMA.calculate({ period: 20, values: closingPrices });
        const sma50 = SMA.calculate({ period: 50, values: closingPrices });
        const rsi = RSI.calculate({ period: 14, values: closingPrices });

        const lastSMA20 = sma20[sma20.length - 1];
        const lastSMA50 = sma50[sma50.length - 1];
        const lastRSI = rsi[rsi.length - 1];

        // --- Original 'calculateScore' Logic (Simplified) ---
        // We distill the essence of the logic into a decisive vote.

        let score = 0;
        const reasons: string[] = [];

        // Trend
        if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50) {
            score += 30;
            reasons.push("Perfect Bull Alignment");
        } else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50) {
            score -= 30;
            reasons.push("Bear Trend");
        }

        // RSI
        if (lastRSI < 30) {
            score += 20;
            reasons.push(`Oversold (RSI ${Math.round(lastRSI)})`);
        } else if (lastRSI > 70) {
            score -= 20;
            reasons.push(`Overbought (RSI ${Math.round(lastRSI)})`);
        }

        // Regime Bonus
        if (regime === 'SQUEEZE') {
            reasons.push("Squeeze Detected (Await Breakout)");
            // Neutralize score for squeeze until breakout?
            // Or small bullish bias if price > sma20?
            if (lastPrice > lastSMA20) score += 10;
        } else if (regime === 'VOLATILE') {
            reasons.push("High Volatility (Caution)");
            score *= 0.5; // Reduce confidence
        }

        // Determine Signal
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = Math.min(Math.abs(score), 100);

        if (score >= 25) signal = 'BUY';
        else if (score <= -25) signal = 'SELL';

        // Boost confidence for strong signals
        if (Math.abs(score) > 50) confidence = 90;

        return {
            name: this.name,
            role: this.role,
            signal,
            confidence,
            reason: reasons.join(", ") || "No clear signal",
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

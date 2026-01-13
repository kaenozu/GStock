import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { RSI, BollingerBands } from 'technicalindicators';
import { calculateStochastic, getStochasticSignal } from '@/lib/api/indicators/stochastic';
import { calculateWilliamsR, getWilliamsRSignal } from '@/lib/api/indicators/williams-r';
import { calculateCCI, getCCISignal } from '@/lib/api/indicators/cci';

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
        const stochastic = calculateStochastic(data, 14, 3);
        const williamsR = calculateWilliamsR(data, 14);
        const cci = calculateCCI(data, 20);

        const lastRSI = rsi[rsi.length - 1];
        const lastBB = bb[bb.length - 1];
        const lastStoch = stochastic[stochastic.length - 1];
        const lastWilliamsR = williamsR[williamsR.length - 1];
        const lastCCI = cci[cci.length - 1];

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

        // Stochastic Oscillator
        if (lastStoch) {
            const stochSignal = getStochasticSignal(lastStoch);
            if (stochSignal === 'OVERSOLD') {
                score += 35;
                reasons.push(`Stochastic Oversold (K:${Math.round(lastStoch.k)}, D:${Math.round(lastStoch.d)})`);
            } else if (stochSignal === 'OVERBOUGHT') {
                score -= 35;
                reasons.push(`Stochastic Overbought (K:${Math.round(lastStoch.k)}, D:${Math.round(lastStoch.d)})`);
            }

            // Stochastic Golden Cross/Dead Cross
            const prevStoch = stochastic[stochastic.length - 2];
            if (prevStoch && lastStoch.k > lastStoch.d && prevStoch.k < prevStoch.d && lastStoch.k < 30) {
                score += 20;
                reasons.push("Stochastic Golden Cross (Bullish)");
            } else if (prevStoch && lastStoch.k < lastStoch.d && prevStoch.k > prevStoch.d && lastStoch.k > 70) {
                score -= 20;
                reasons.push("Stochastic Dead Cross (Bearish)");
            }
        }

        // Williams %R
        const williamsSignal = getWilliamsRSignal(lastWilliamsR);
        if (williamsSignal === 'OVERSOLD') {
            score += 30;
            reasons.push(`Williams %R Oversold (${Math.round(lastWilliamsR)})`);
        } else if (williamsSignal === 'OVERBOUGHT') {
            score -= 30;
            reasons.push(`Williams %R Overbought (${Math.round(lastWilliamsR)})`);
        }

        // CCI
        const cciSignal = getCCISignal(lastCCI);
        if (cciSignal === 'OVERSOLD') {
            score += 25;
            reasons.push(`CCI Oversold (${Math.round(lastCCI)})`);
        } else if (cciSignal === 'OVERBOUGHT') {
            score -= 25;
            reasons.push(`CCI Overbought (${Math.round(lastCCI)})`);
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

import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { SMA, MACD } from 'technicalindicators';

export class TrendAgent implements Agent {
    id = 'trend_agent';
    name = 'Trend Follower';
    role: Agent['role'] = 'TREND';

    analyze(data: StockDataPoint[], regime?: MarketRegime): AgentResult {
        if (data.length < 50) return this.neutralResult("Insufficient data");

        const closingPrices = data.map((d) => d.close);
        const lastPrice = closingPrices[closingPrices.length - 1];

        const sma20 = SMA.calculate({ period: 20, values: closingPrices });
        const sma50 = SMA.calculate({ period: 50, values: closingPrices });
        const macd = MACD.calculate({ values: closingPrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });

        const lastSMA20 = sma20[sma20.length - 1];
        const lastSMA50 = sma50[sma50.length - 1];
        const lastMACD = macd[macd.length - 1];
        const prevMACD = macd[macd.length - 2];

        // Logic: Pure Trend Following
        let score = 0;
        const reasons: string[] = [];

        // SMA Perfect Order
        if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50) {
            score += 40;
            reasons.push("Perfect Order (Price > SMA20 > SMA50)");
        } else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50) {
            score -= 40;
            reasons.push("Dead Cross Order");
        }

        // MACD
        if (lastMACD && prevMACD && lastMACD.MACD !== undefined && lastMACD.signal !== undefined) {
            if (lastMACD.MACD > lastMACD.signal) {
                score += 20;
                // Check histograms
                const curHist = lastMACD.histogram;
                const prevHist = prevMACD.histogram;

                if (curHist !== undefined && prevHist !== undefined && curHist > 0 && curHist > prevHist) {
                    score += 10;
                    reasons.push("MACD Momentum Rising");
                }
            } else {
                score -= 20;
            }
        }

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        const confidence = Math.min(Math.abs(score), 100);

        if (score >= 30) signal = 'BUY';
        else if (score <= -30) signal = 'SELL';

        return {
            name: this.name,
            role: this.role,
            signal,
            confidence,
            reason: reasons.join(", ") || "No strong trend",
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

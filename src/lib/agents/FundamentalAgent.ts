import { AgentResult } from './types';
import { CompanyFinancials } from '../api/providers/FinnhubProvider';

interface FundamentalInput {
    symbol: string;
    financials: CompanyFinancials;
}

// Note: FundamentalAgent doesn't implement Agent interface because
// it takes FundamentalInput instead of StockDataPoint[].
// It's used separately for scoring company health.
export class FundamentalAgent {
    id = 'fundamental-analyst';
    name = 'Fundamental Analyst';
    role = 'FUNDAMENTAL' as const;

    analyze(input: FundamentalInput): AgentResult {
        const { financials } = input;

        let score = 50;
        let reasons: string[] = [];

        // P/E Analysis
        if (financials.pe !== null) {
            if (financials.pe > 0 && financials.pe < 15) {
                score += 15;
                reasons.push(`Attractive PE (${financials.pe.toFixed(1)})`);
            } else if (financials.pe >= 15 && financials.pe < 25) {
                score += 5;
                reasons.push(`Fair PE (${financials.pe.toFixed(1)})`);
            } else if (financials.pe >= 25 && financials.pe < 50) {
                score -= 5;
                reasons.push(`High PE (${financials.pe.toFixed(1)})`);
            } else if (financials.pe >= 50) {
                score -= 15;
                reasons.push(`Overvalued PE (${financials.pe.toFixed(1)})`);
            } else if (financials.pe < 0) {
                score -= 20;
                reasons.push(`Negative PE (Loss-making)`);
            }
        }

        // EPS Growth
        if (financials.epsGrowth !== null) {
            if (financials.epsGrowth > 20) {
                score += 15;
                reasons.push(`Strong EPS Growth (${financials.epsGrowth.toFixed(1)}%)`);
            } else if (financials.epsGrowth > 10) {
                score += 10;
                reasons.push(`Good EPS Growth (${financials.epsGrowth.toFixed(1)}%)`);
            } else if (financials.epsGrowth < 0) {
                score -= 10;
                reasons.push(`Declining EPS (${financials.epsGrowth.toFixed(1)}%)`);
            }
        }

        // ROE
        if (financials.roe !== null) {
            if (financials.roe > 20) {
                score += 10;
                reasons.push(`Excellent ROE (${financials.roe.toFixed(1)}%)`);
            } else if (financials.roe > 10) {
                score += 5;
            } else if (financials.roe < 5) {
                score -= 5;
                reasons.push(`Weak ROE (${financials.roe.toFixed(1)}%)`);
            }
        }

        // Revenue Growth
        if (financials.revenueGrowth !== null) {
            if (financials.revenueGrowth > 15) {
                score += 10;
                reasons.push(`Revenue Accelerating (${financials.revenueGrowth.toFixed(1)}%)`);
            } else if (financials.revenueGrowth < 0) {
                score -= 10;
                reasons.push(`Revenue Declining (${financials.revenueGrowth.toFixed(1)}%)`);
            }
        }

        score = Math.max(0, Math.min(100, score));

        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        if (score >= 65) {
            sentiment = 'BULLISH';
        } else if (score <= 35) {
            sentiment = 'BEARISH';
        } else {
            sentiment = 'NEUTRAL';
        }

        return {
            name: this.name,
            sentiment,
            signal: sentiment === 'BULLISH' ? 'BUY' : sentiment === 'BEARISH' ? 'SELL' : 'HOLD',
            confidence: score,
            reason: reasons.length > 0 ? reasons.join('. ') : 'Insufficient fundamental data.',
            role: 'FUNDAMENTAL'
        };
    }
}

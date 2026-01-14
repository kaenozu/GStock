import { BaseAgent } from './BaseAgent';
import { AgentResult, AgentRole } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';

export class MacroEconomicAgent extends BaseAgent {
    id = 'macro_economic_agent';
    name = 'Macro Economic Analyzer';
    role: AgentRole = 'MACRO';

    private historicalData: {
        interestRate: number;
        inflationRate: number;
        gdpGrowth: number;
        unemploymentRate: number;
        date: Date;
    }[] = [];

    private thresholds = {
        highInterestRate: 4.5,
        lowInterestRate: 2.0,
        highInflation: 4.0,
        lowInflation: 1.5,
        highUnemployment: 6.0,
        lowUnemployment: 4.0,
        healthyGDPGrowth: 2.0,
        recessionaryGDPGrowth: 0.0
    };

    analyze(data: StockDataPoint[], marketRegime?: MarketRegime, macroData?: {
        interestRate: number;
        inflationRate: number;
        gdpGrowth?: number;
        unemploymentRate?: number;
    }): AgentResult {
        if (!macroData) {
            return this.neutralResult("No macro economic data available");
        }

        let score = 0;
        const reasons: string[] = [];

        const { interestRate, inflationRate, gdpGrowth, unemploymentRate } = macroData;

        if (interestRate !== undefined) {
            if (interestRate < this.thresholds.lowInterestRate) {
                score += 25;
                reasons.push(`Low interest rate (${interestRate}%) supports economic growth`);
            } else if (interestRate > this.thresholds.highInterestRate) {
                score -= 30;
                reasons.push(`High interest rate (${interestRate}%) may slow economy`);
            } else {
                reasons.push(`Interest rate (${interestRate}%) is moderate`);
            }
        }

        if (inflationRate !== undefined) {
            if (inflationRate > this.thresholds.highInflation) {
                score -= 25;
                reasons.push(`High inflation (${inflationRate}%) concerns`);
            } else if (inflationRate < this.thresholds.lowInflation) {
                score += 10;
                reasons.push(`Low inflation (${inflationRate}%) is favorable`);
            } else {
                reasons.push(`Inflation (${inflationRate}%) is under control`);
            }
        }

        if (gdpGrowth !== undefined) {
            if (gdpGrowth > this.thresholds.healthyGDPGrowth) {
                score += 20;
                reasons.push(`Strong GDP growth (${gdpGrowth}%)`);
            } else if (gdpGrowth < this.thresholds.recessionaryGDPGrowth) {
                score -= 35;
                reasons.push(`Negative GDP growth (${gdpGrowth}%) indicates recession`);
            } else {
                reasons.push(`GDP growth (${gdpGrowth}%) is moderate`);
            }
        }

        if (unemploymentRate !== undefined) {
            if (unemploymentRate < this.thresholds.lowUnemployment) {
                score += 10;
                reasons.push(`Low unemployment (${unemploymentRate}%) indicates strong economy`);
            } else if (unemploymentRate > this.thresholds.highUnemployment) {
                score -= 20;
                reasons.push(`High unemployment (${unemploymentRate}%) concerns`);
            }
        }

        const confidence = Math.min(Math.abs(score), 100);

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

        if (score >= 40) {
            signal = 'BUY';
            sentiment = 'BULLISH';
        } else if (score <= -40) {
            signal = 'SELL';
            sentiment = 'BEARISH';
        }

        return this.createResult(
            signal,
            confidence,
            reasons.join('; ') || "Mixed macro economic signals",
            sentiment
        );
    }


    setThresholds(thresholds: Partial<typeof this.thresholds>): void {
        Object.assign(this.thresholds, thresholds);
    }

    addHistoricalData(data: {
        interestRate: number;
        inflationRate: number;
        gdpGrowth: number;
        unemploymentRate: number;
        date: Date;
    }): void {
        this.historicalData.push(data);
    }

    getHistoricalTrends(): {
        interestRateTrend: 'RISING' | 'FALLING' | 'STABLE';
        inflationTrend: 'RISING' | 'FALLING' | 'STABLE';
    } {
        if (this.historicalData.length < 3) {
            return {
                interestRateTrend: 'STABLE',
                inflationTrend: 'STABLE'
            };
        }

        const recent = this.historicalData.slice(-3);
        const interestRateTrend = this.calculateTrend(
            recent.map(d => d.interestRate)
        );
        const inflationTrend = this.calculateTrend(
            recent.map(d => d.inflationRate)
        );

        return {
            interestRateTrend,
            inflationTrend
        };
    }

    private calculateTrend(values: number[]): 'RISING' | 'FALLING' | 'STABLE' {
        if (values.every((v, i) => i === 0 || Math.abs(v - values[i - 1]) < 0.1)) {
            return 'STABLE';
        }
        const first = values[0];
        const last = values[values.length - 1];
        if (last > first + 0.2) return 'RISING';
        if (last < first - 0.2) return 'FALLING';
        return 'STABLE';
    }
}

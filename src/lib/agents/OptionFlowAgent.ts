import { Agent, AgentResult } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';

export interface OptionFlowData {
    symbol: string;
    date: Date;
    callVolume: number;
    putVolume: number;
    callOI: number;
    putOI: number;
    impliedVolatility: number;
    institutionalActivity: 'HIGH' | 'MEDIUM' | 'LOW';
    maxPain?: number;
}

export class OptionFlowAgent implements Agent {
    id = 'option_flow_agent';
    name = 'Option Flow Analyzer';
    role: Agent['role'] = 'OPTION';

    private historicalFlows: OptionFlowData[] = [];

    analyze(
        data: StockDataPoint[],
        marketRegime?: MarketRegime,
        optionFlow?: OptionFlowData
    ): AgentResult {
        if (!optionFlow) {
            return this.neutralResult("No option flow data available");
        }

        let score = 0;
        const reasons: string[] = [];

        const { callVolume, putVolume, callOI, putOI, impliedVolatility, institutionalActivity, maxPain } = optionFlow;
        const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;

        const totalVolume = callVolume + putVolume;
        const putCallRatio = callVolume > 0 ? putVolume / callVolume : 0;
        const oiRatio = callOI > 0 ? putOI / callOI : 0;

        if (putCallRatio < 0.6) {
            score += 30;
            reasons.push(`Bullish Put/Call ratio (${putCallRatio.toFixed(2)})`);
        } else if (putCallRatio > 1.4) {
            score -= 30;
            reasons.push(`Bearish Put/Call ratio (${putCallRatio.toFixed(2)})`);
        } else {
            reasons.push(`Neutral Put/Call ratio (${putCallRatio.toFixed(2)})`);
        }

        if (oiRatio < 0.7) {
            score += 20;
            reasons.push(`Bullish OI ratio (${oiRatio.toFixed(2)})`);
        } else if (oiRatio > 1.3) {
            score -= 20;
            reasons.push(`Bearish OI ratio (${oiRatio.toFixed(2)})`);
        }

        if (impliedVolatility > 30) {
            score -= 15;
            reasons.push(`High implied volatility (${impliedVolatility.toFixed(1)}%) suggests fear`);
        } else if (impliedVolatility < 20) {
            score += 10;
            reasons.push(`Low implied volatility (${impliedVolatility.toFixed(1)}%) suggests confidence`);
        }

        if (institutionalActivity === 'HIGH') {
            score += 15;
            reasons.push(`High institutional activity indicates strong interest`);
        } else if (institutionalActivity === 'LOW') {
            score -= 10;
            reasons.push(`Low institutional activity`);
        }

        if (maxPain && currentPrice > 0) {
            const priceVsMaxPain = ((currentPrice - maxPain) / maxPain) * 100;
            if (priceVsMaxPain > 5) {
                score += 10;
                reasons.push(`Price above max pain (${maxPain.toFixed(2)})`);
            } else if (priceVsMaxPain < -5) {
                score -= 10;
                reasons.push(`Price below max pain (${maxPain.toFixed(2)})`);
            }
        }

        const confidence = Math.min(Math.abs(score), 100);

        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

        if (score >= 50) {
            signal = 'BUY';
            sentiment = 'BULLISH';
        } else if (score <= -50) {
            signal = 'SELL';
            sentiment = 'BEARISH';
        }

        return {
            name: this.name,
            role: this.role,
            signal,
            confidence,
            reason: reasons.join('; ') || "Mixed option flow signals",
            sentiment
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

    addHistoricalFlow(flowData: OptionFlowData): void {
        this.historicalFlows.push(flowData);
        if (this.historicalFlows.length > 30) {
            this.historicalFlows.shift();
        }
    }

    getTrend(): {
        volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
        sentimentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    } {
        if (this.historicalFlows.length < 5) {
            return {
                volumeTrend: 'STABLE',
                sentimentTrend: 'NEUTRAL'
            };
        }

        const recent = this.historicalFlows.slice(-5);
        const volumes = recent.map(f => f.callVolume + f.putVolume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const recentAvgVolume = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3;

        let volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
        if (recentAvgVolume > avgVolume * 1.2) {
            volumeTrend = 'INCREASING';
        } else if (recentAvgVolume < avgVolume * 0.8) {
            volumeTrend = 'DECREASING';
        }

        const recentSentiments = recent.map(f => {
            const putCallRatio = f.callVolume > 0 ? f.putVolume / f.callVolume : 1;
            return putCallRatio < 0.8 ? 'BULLISH' : putCallRatio > 1.2 ? 'BEARISH' : 'NEUTRAL';
        });

        const bullishCount = recentSentiments.filter(s => s === 'BULLISH').length;
        const bearishCount = recentSentiments.filter(s => s === 'BEARISH').length;

        let sentimentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (bullishCount >= 3) {
            sentimentTrend = 'BULLISH';
        } else if (bearishCount >= 3) {
            sentimentTrend = 'BEARISH';
        }

        return {
            volumeTrend,
            sentimentTrend
        };
    }

    getUnusualActivity(threshold: number = 2.5): {
        symbol: string;
        callVolume: number;
        putVolume: number;
        avgCallVolume: number;
        avgPutVolume: number;
    } | null {
        if (this.historicalFlows.length < 10) return null;

        const recent = this.historicalFlows[this.historicalFlows.length - 1];
        const historical = this.historicalFlows.slice(0, -1);

        const avgCallVolume = historical.reduce((sum, f) => sum + f.callVolume, 0) / historical.length;
        const avgPutVolume = historical.reduce((sum, f) => sum + f.putVolume, 0) / historical.length;

        if (recent.callVolume > avgCallVolume * threshold || recent.putVolume > avgPutVolume * threshold) {
            return {
                symbol: recent.symbol,
                callVolume: recent.callVolume,
                putVolume: recent.putVolume,
                avgCallVolume,
                avgPutVolume
            };
        }

        return null;
    }
}

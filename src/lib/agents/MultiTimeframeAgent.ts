import { Agent, AgentResult, AgentRole } from './types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { SMA, RSI } from 'technicalindicators';

export interface MultiTimeframeAnalysis {
  timeframe: string;
  data: StockDataPoint[];
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export class MultiTimeframeAgent implements Agent {
  id = 'multi_timeframe_agent';
  name = 'Multi-Timeframe Analyzer';
  role: AgentRole = 'MULTI_TIMEFRAME';

  analyze(inputData: any, _regime?: MarketRegime): AgentResult {
    let timeframeData: Record<string, StockDataPoint[]>;

    if (Array.isArray(inputData)) {
      // If single array is passed, treat as Daily
      timeframeData = { 'daily': inputData };
    } else {
      timeframeData = inputData;
    }

    const timeframes = Object.keys(timeframeData);

    if (timeframes.length === 0) {
      return this.neutralResult("No timeframe data provided");
    }

    const analyses: MultiTimeframeAnalysis[] = [];

    for (const [timeframe, data] of Object.entries(timeframeData)) {
      if (data.length < 20) continue;

      const prices = data.map(d => d.close);
      const sma20 = SMA.calculate({ period: 20, values: prices });
      const rsi = RSI.calculate({ period: 14, values: prices });

      const lastPrice = prices[prices.length - 1];
      const lastSMA20 = sma20[sma20.length - 1];
      const lastRSI = rsi[rsi.length - 1];

      let score = 0;

      if (lastPrice > lastSMA20) {
        score += 40;
      } else {
        score -= 40;
      }

      if (lastRSI < 30) {
        score += 30;
      } else if (lastRSI > 70) {
        score -= 30;
      }

      const signal: 'BUY' | 'SELL' | 'HOLD' = score >= 30 ? 'BUY' : score <= -30 ? 'SELL' : 'HOLD';

      analyses.push({
        timeframe,
        data,
        signal,
        confidence: Math.min(Math.abs(score), 100),
      });
    }

    if (analyses.length === 0) {
      return this.neutralResult("Insufficient data for any timeframe");
    }

    const bullishCount = analyses.filter(a => a.signal === 'BUY').length;
    const bearishCount = analyses.filter(a => a.signal === 'SELL').length;
    const total = analyses.length;

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0;

    if (bullishCount > bearishCount && bullishCount / total >= 0.6) {
      signal = 'BUY';
      confidence = (bullishCount / total) * 100;
    } else if (bearishCount > bullishCount && bearishCount / total >= 0.6) {
      signal = 'SELL';
      confidence = (bearishCount / total) * 100;
    }

    const timeframeResults = analyses.map(a => `${a.timeframe}:${a.signal}`).join(', ');

    return {
      name: this.name,
      role: this.role,
      signal,
      confidence: Math.round(confidence),
      reason: `Timeframe consensus: ${timeframeResults} (${bullishCount}/${total} BUY, ${bearishCount}/${total} SELL)`,
      sentiment: signal === 'BUY' ? 'BULLISH' : signal === 'SELL' ? 'BEARISH' : 'NEUTRAL'
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

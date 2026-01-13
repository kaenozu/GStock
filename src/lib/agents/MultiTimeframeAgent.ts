import { Agent, AgentResult } from './types';
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
  role = 'MULTI_TIMEFRAME' as const;

  analyze(data: StockDataPoint[], _regime?: MarketRegime): AgentResult {
    if (data.length < 20) {
      return this.neutralResult("Insufficient data");
    }

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

    return {
      name: this.name,
      role: this.role,
      signal,
      confidence: Math.min(Math.abs(score), 100),
      reason: `Multi-Timeframe: ${signal} (Price ${lastPrice.toFixed(2)} vs SMA20 ${lastSMA20.toFixed(2)}, RSI ${lastRSI.toFixed(2)})`,
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

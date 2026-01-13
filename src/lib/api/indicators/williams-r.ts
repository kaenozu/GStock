import { StockDataPoint } from '@/types/market';

export const calculateWilliamsR = (
  data: StockDataPoint[],
  period: number = 14
): number[] => {
  if (data.length < period) {
    return [];
  }

  const results: number[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);
    
    const highestHigh = Math.max(...window.map(d => d.high));
    const lowestLow = Math.min(...window.map(d => d.low));
    const currentClose = data[i].close;
    
    const williamsR = -100 * ((highestHigh - currentClose) / (highestHigh - lowestLow));
    
    results.push(williamsR);
  }

  return results;
};

export const getWilliamsRSignal = (williamsR: number): 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' => {
  if (williamsR > -20) {
    return 'OVERBOUGHT';
  }
  if (williamsR < -80) {
    return 'OVERSOLD';
  }
  return 'NEUTRAL';
};

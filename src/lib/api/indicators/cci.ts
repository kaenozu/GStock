import { StockDataPoint } from '@/types/market';

export const calculateCCI = (
  data: StockDataPoint[],
  period: number = 20
): number[] => {
  if (data.length < period) {
    return [];
  }

  const results: number[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);
    
    const typicalPrices = window.map(d => (d.high + d.low + d.close) / 3);
    const smaTP = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period;
    
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;
    
    const cci = (typicalPrices[typicalPrices.length - 1] - smaTP) / (0.015 * meanDeviation);
    
    results.push(cci);
  }

  return results;
};

export const getCCISignal = (cci: number): 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' => {
  if (cci > 100) {
    return 'OVERBOUGHT';
  }
  if (cci < -100) {
    return 'OVERSOLD';
  }
  return 'NEUTRAL';
};

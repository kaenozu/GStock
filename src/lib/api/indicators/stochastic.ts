import { StockDataPoint } from '@/types/market';

export interface StochasticResult {
  k: number;
  d: number;
}

export const calculateStochastic = (
  data: StockDataPoint[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult[] => {
  if (data.length < kPeriod + dPeriod) {
    return [];
  }

  const results: StochasticResult[] = [];

  for (let i = kPeriod - 1; i < data.length; i++) {
    const window = data.slice(i - kPeriod + 1, i + 1);
    
    const highestHigh = Math.max(...window.map(d => d.high));
    const lowestLow = Math.min(...window.map(d => d.low));
    const currentClose = data[i].close;
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    results.push({ k, d: 0 });
  }

  const dResults: StochasticResult[] = [];
  for (let i = dPeriod - 1; i < results.length; i++) {
    const kWindow = results.slice(i - dPeriod + 1, i + 1);
    const d = kWindow.reduce((sum, r) => sum + r.k, 0) / dPeriod;
    
    dResults.push({ k: results[i].k, d });
  }

  return dResults;
};

export const getStochasticSignal = (stoch: StochasticResult): 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' => {
  if (stoch.k > 80 && stoch.d > 80) {
    return 'OVERBOUGHT';
  }
  if (stoch.k < 20 && stoch.d < 20) {
    return 'OVERSOLD';
  }
  
  if (stoch.k < stoch.d && stoch.k > 70) {
    return 'OVERBOUGHT';
  }
  if (stoch.k > stoch.d && stoch.k < 30) {
    return 'OVERSOLD';
  }
  
  return 'NEUTRAL';
};

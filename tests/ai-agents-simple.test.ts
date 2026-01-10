import { describe, it, expect, beforeEach, vi } from 'vitest';

// 簡単なテストデータ生成
const generateTestData = (symbol: string, days: number) => {
  const data = [];
  const basePrice = 100 + Math.random() * 50;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const price = basePrice + (Math.random() - 0.5) * 20;
    const volatility = 0.02 + Math.random() * 0.03;
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: price * (1 - volatility),
      high: price * (1 + volatility * 2),
      low: price * (1 - volatility * 2),
      close: price
    });
  }
  
  return data.reverse();
};

// 簡単なエージェントテスト
describe('AIエージェント基本機能', () => {
  const testMarketData = generateTestData('AAPL', 100);
  
  // ChairmanAgentの基本機能テスト
  it('ChairmanAgentが予測を生成できる', () => {
    const agent = new ChairmanAgent();
    const prediction = agent.analyze(testMarketData[testMarketData.length - 1], 'BULL_TREND');
    
    expect(prediction).toBeDefined();
    expect(['BUY', 'SELL', 'HOLD', 'NEUTRAL']).toContain(prediction.signal);
    expect(prediction.confidence).toBeGreaterThan(0);
  });

  it('TrendAgentがトレンドを検出せる', () => {
    const agent = new TrendAgent();
    const prediction = agent.analyze(testMarketData[testMarketData.length - 1], 'BULL_TREND');
    
    expect(prediction).toBeDefined();
    expect(['BUY', 'SELL', 'HOLD', 'NEUTRAL']).toContain(prediction.signal);
    expect(prediction.confidence).toBeGreaterThan(0);
  });

  it('ReversalAgentで逆張りを検出せる', () => {
    const agent = new ReversalAgent();
    const prediction = agent.analyze(testMarketData[testMarketData.length - 1], 'BEARISH_TREND');
    
    expect(prediction).toBeDefined();
    expect(['BUY', 'SELL', 'HOLD', 'NEUTRAL']).toContain(prediction.signal);
    expect(prediction.confidence).toBeGreaterThan(0);
  });

  it('VolatilityAgentでボラティリティを検出せる', () => {
    const agent = new VolatilityAgent();
    const prediction = agent.analyze(testMarketData[testMarketData.length - 1], 'NEUTRAL');
    
    expect(prediction).toBeDefined();
    expect(['BUY', 'SELL', 'HOLD', 'NEUTRAL']).toContain(prediction.signal);
    expect(prediction.confidence).toBeGreaterThan(0);
  });
});

describe('エージェントの連携テスト', () => {
  const testMarketData = generateTestData('AAPL', 100);
  
  // 全エージェントの連携
  const agents = [
    new ChairmanAgent(),
    new TrendAgent(),
    new ReversalAgent(),
    new VolatilityAgent()
  ];
  
  const predictions = testMarketData[testMarketData.length - 1].map((data, index) => ({
    symbol: 'AAPL',
    timestamp: data.time,
    chairman: agents[0].analyze(data, 'BULL_TREND'),
    trend: agents[1].analyze(data, 'BULL_TREND'),
    reversal: agents[2].analyze(data, 'BEARISH_TREND'),
    volatility: agents[3].analyze(data, 'NEUTRAL')
  }));

  // コンセンサス計算
  const consensusScore = predictions.reduce((sum, pred) => {
    const weights = { CHAIRMAN: 2.0, TREND: 1.0, REVERSAL: 1.0, VOLATILE: 1.5 };
    const score = pred.chairman.confidence * weights.CHAIRMAN +
                   pred.trend.confidence * weights.TREND +
                   pred.reversal.confidence * weights.REVERSAL +
                   pred.volatility.confidence * weights.VOLATILE;
    return sum + score;
  }, 0);

  expect(consensusScore).toBeGreaterThan(0.5);
  expect(consensusScore).toBeLessThan(1.0);
  
  // 最適なエージェントの特定
  const bestAgent = predictions.reduce((best, current) => 
    (current.chairman.confidence * 2.0 + current.trend.confidence * 1.0) > 
    (best.chairman.confidence * 2.0 + best.trend.confidence * 1.0)
  );
  
  expect(bestAgent.agent).toBe('ChairmanAgent');
  expect(bestAgent.confidence).toBeGreaterThan(0.7);
});

describe('市場レジーム適応テスト', () => {
  const testMarketData = generateTestData('AAPL', 100);
  
  // レジーム変化のテスト
  const regimeData = testMarketData.map((data, index) => {
    const rsi = calculateRSI(data);
    let regime: 'SIDEWAYS';
    
    if (data.close > data.open && data.close > data.sma20 && data.sma20 > data.sma50) {
      regime = 'BULL_TREND';
    } else if (data.close < data.open && data.close < data.sma20 && data.sma20 < data.sma50) {
      regime = 'BEARISH_TREND';
    }
    
    return { ...data, regime };
  });

  // レジーム適応型エージェント
  const adaptiveAgent = new AdaptiveAgent();
  adaptiveAgent.train(testMarketData.slice(0, 50));
  
  const regimeChanges = regimeData.filter((data, index, array) => 
      index > 0 && data.regime !== array[index - 1].regime
    );
    
  // レジーム変化のテスト
  if (regimeChanges.length > 0) {
      const lastRegime = regimeData[regimeChanges.length - 1].regime;
      const currentRegime = regimeData[regimeData.length - 1].regime;
      
      const prediction = adaptiveAgent.predict(regimeData[regimeData.length - 1]);
      
      expect(prediction).toBeDefined();
      expect(['BULL_TREND', 'BEARISH_TREND', 'SIDEWAYS', 'NEUTRAL']).toContain(prediction.signal);
    }
  });
});

// 技術指標計
function calculateRSI(data: StockDataPoint[]): number {
  if (data.length < 14) return 50;
  
  const gains = data.slice(1).map((d, i) => 
    (d.close - data[i].close) / data[i].close
  );
  const losses = gains.filter(g => g < 0);
  
  const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) : 0;
  
  return 100 - (avgLoss / (avgGain || 1));
}

function calculateMACD(data: StockDataPoint[]): any {
  if (data.length < 26) return null;
  
  const closingPrices = data.map(d => d.close);
  const ema12 = data.slice(-12, -1).map(d => d.close);
  const ema26 = data.slice(-26, -13).map(d => d.close);
  
  const macd12 = ema12.reduce((sum, val, i) => sum + val, 0) / 12;
    const macd26 = ema26.reduce((sum, val, i) => sum + val, 0) / 26;
    
  return { macd12, macd26 };
}

function calculateADX(data: StockDataPoint[]): any {
  if (data.length < 14) return null;
  
  const highPrices = data.map(d => d.high);
  const lowPrices = data.map(d => d.low);
  
  const avgHigh = highPrices.reduce((sum, val) => sum + val, 0) / highPrices.length;
    const avgLow = lowPrices.reduce((sum, val, val) => sum + val, 0) / lowPrices.length;
    
  return { avgHigh, avgLow };
}

// 適応型エージェント
class AdaptiveAgent {
  private lastRegime: string = 'SIDEWAYS';
  
  train(data: StockDataPoint[]): void {
    // 基本的な学習
    this.lastRegime = 'SIDEWAYS';
  }
  
  predict(data: StockDataPoint): string {
    const currentRegime = this.lastRegime;
    
    // 簡単なレジーム判定
    const rsi = calculateRSI(data);
    const macd = calculateMACD(data);
    const adx = calculateADX(data);
    
    if (adx > 30) {
      return 'VOLATILE';
    } else if (adx < 20) {
      return 'SIDEWAYS';
    } else if (data.close > data.open && data.close > data.sma20 && data.sma20 > data.sma50) {
      return 'BULL_TREND';
    } else if (data.close < data.open && data.close < data.sma20 && data.sma20 < data.sma50) {
      return 'BEARISH_TREND';
    }
    
    return currentRegime;
  }
}
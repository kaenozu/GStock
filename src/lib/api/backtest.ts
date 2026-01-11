import { StockDataPoint, BacktestResult, ChartMarker, MarketRegime } from '@/types/market';
import { calculateHistoricalSignals } from './prediction-engine';

export interface BacktestParams {
  buyThreshold: number;
  sellThreshold: number;
}

export interface OptimizationResult {
  params: BacktestParams;
  result: BacktestResult;
}

/**
 * シミュレーション実行コア関数
 */
interface AISignal {
  price: number;
  time: string;
  confidence: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

const runSimulation = (
  data: StockDataPoint[],
  aiSignals: AISignal[],
  params: BacktestParams,
  initialBalance: number
): BacktestResult => {
  let balance = initialBalance;
  let position: { entryPrice: number, amount: number } | null = null;
  let winCount = 0;
  let tradeCount = 0;
  const markers: ChartMarker[] = [];

  const { buyThreshold, sellThreshold } = params;

  for (const signal of aiSignals) {
    const currentPrice = signal.price;
    const currentTime = signal.time;
    const confidence = signal.confidence;
    const sentiment = signal.sentiment;

    // ENTRY (買い)
    // 信頼度が買い閾値以上ならエントリー
    if (position === null && sentiment === 'BULLISH' && confidence >= buyThreshold) {
      const amount = balance / currentPrice;
      position = { entryPrice: currentPrice, amount };
      balance = 0;

      markers.push({
        time: currentTime,
        position: 'belowBar',
        color: '#2196F3',
        shape: 'arrowUp',
        text: `BUY (AI:${confidence}%)`,
        size: 2
      });
    }
    // EXIT (売り)
    // 1. ベア転換 または
    // 2. ブル継続だが信頼度が売り閾値以下に低下
    else if (position !== null) {
      const shouldSell = (sentiment === 'BEARISH') || (sentiment === 'BULLISH' && confidence <= sellThreshold);

      if (shouldSell) {
        const sellValue = position.amount * currentPrice;
        const profit = sellValue - (position.amount * position.entryPrice);

        if (profit > 0) winCount++;
        tradeCount++;

        balance = sellValue;
        position = null;

        markers.push({
          time: currentTime,
          position: 'aboveBar',
          color: profit > 0 ? '#4CAF50' : '#FF5252',
          shape: 'arrowDown',
          text: `SELL (${profit > 0 ? '+' : ''}${Math.round(profit)})`,
          size: 2
        });
      }
    }
  }

  // 最終ポジション評価
  if (position !== null) {
    const currentValue = position.amount * data[data.length - 1].close;
    balance = currentValue;
  }

  const profit = balance - initialBalance;

  return {
    initialBalance,
    finalBalance: Math.round(balance),
    profit: Math.round(profit),
    profitPercent: parseFloat(((profit / initialBalance) * 100).toFixed(2)),
    trades: tradeCount,
    winRate: tradeCount > 0 ? Math.round((winCount / tradeCount) * 100) : 0,
    markers
  };
};

/**
 * デフォルト設定でのバックテスト（後方互換性用）
 */
export const runBacktest = (data: StockDataPoint[], initialBalance: number = 10000): BacktestResult => {
  if (data.length < 50) return createEmptyResult(initialBalance);

  const aiSignals = calculateHistoricalSignals(data);
  // デフォルトはやや保守的な設定
  return runSimulation(data, aiSignals, { buyThreshold: 75, sellThreshold: 40 }, initialBalance);
};

/**
 * 最適戦略探索機能 (Regime-Aware Auto-Tuning)
 * 市場環境に応じて探索グリッドを動的に調整し、最適なパラメータを見つける
 */
export const findOptimalStrategy = (data: StockDataPoint[], regime: MarketRegime = 'SIDEWAYS', initialBalance: number = 10000): OptimizationResult => {
  if (data.length < 50) {
    return {
      params: { buyThreshold: 75, sellThreshold: 40 },
      result: createEmptyResult(initialBalance)
    };
  }

  const aiSignals = calculateHistoricalSignals(data);

  // Adaptive Grid Search: Regimeに応じた探索範囲の定義
  let buyThresholds: number[];
  let sellThresholds: number[];

  switch (regime) {
    case 'BULL_TREND':
    case 'SQUEEZE': // 爆発前夜は積極的に攻める
      // 積極策: 早期エントリー(55%~)を許可
      buyThresholds = [55, 60, 65, 70, 75, 80, 85];
      sellThresholds = [20, 30, 40, 50]; // 利確・損切りは標準的
      break;

    case 'VOLATILE':
    case 'BEAR_TREND':
      // 防衛策: 確実性の高い場面(80%~)のみエントリー、損切りは浅く(60%以下で即撤退)
      buyThresholds = [80, 85, 90, 95];
      sellThresholds = [40, 50, 60, 70];
      break;

    case 'SIDEWAYS':
    default:
      // 標準策
      buyThresholds = [65, 70, 75, 80, 85];
      sellThresholds = [30, 40, 50, 60];
      break;
  }

  let bestResult: BacktestResult | null = null;
  let bestParams: BacktestParams = { buyThreshold: 75, sellThreshold: 40 }; // 初期値

  // グリッドサーチ実行
  for (const buy of buyThresholds) {
    for (const sell of sellThresholds) {
      // 買い閾値は売り閾値より最低10ポイント高く設定（頻繁すぎる売買を防ぐ）
      if (buy < sell + 10) continue;

      const result = runSimulation(data, aiSignals, { buyThreshold: buy, sellThreshold: sell }, initialBalance);

      // 評価ロジック:
      // 1. 利益が最大のものを選ぶ
      // 2. 利益が同じなら、トレード回数が少ない方（効率重視）を選ぶ
      if (!bestResult || result.profit > bestResult.profit) {
        bestResult = result;
        bestParams = { buyThreshold: buy, sellThreshold: sell };
      } else if (result.profit === bestResult.profit && result.trades < bestResult.trades) {
        // 同利益なら手数料リスクの低い方を選択
        bestResult = result;
        bestParams = { buyThreshold: buy, sellThreshold: sell };
      }
    }
  }

  return {
    params: bestParams,
    result: bestResult || runSimulation(data, aiSignals, bestParams, initialBalance)
  };
};

const createEmptyResult = (initialBalance: number): BacktestResult => ({
  initialBalance,
  trades: 0,
  profit: 0,
  profitPercent: 0,
  winRate: 0,
  finalBalance: initialBalance,
  markers: []
});
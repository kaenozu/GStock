import { StockDataPoint, BacktestResult, ChartMarker } from '@/types/market';
import { calculateHistoricalSignals } from './prediction-engine';

/**
 * 高精度バックテストエンジン (G-Engine AI連動版)
 * 
 * 従来の単純なSMAクロスではなく、AI予測エンジンが弾き出した「信頼度スコア」に基づいて
 * 売買シミュレーションを行う。これにより、表示される信頼度の実効性を証明する。
 */
export const runBacktest = (data: StockDataPoint[], initialBalance: number = 10000): BacktestResult => {
  if (data.length < 50) {
    return {
      initialBalance,
      trades: 0,
      profit: 0,
      profitPercent: 0,
      winRate: 0,
      finalBalance: initialBalance,
      markers: []
    };
  }

  // 1. 全期間のAI判断を取得
  const aiSignals = calculateHistoricalSignals(data);
  
  let balance = initialBalance;
  let position: { entryPrice: number, amount: number } | null = null;
  let winCount = 0;
  let tradeCount = 0;
  const markers: ChartMarker[] = [];

  // 売買ルールの定義
  const BUY_THRESHOLD = 75; // 信頼度75%以上で買い
  const SELL_THRESHOLD = 40; // 信頼度40%以下で手仕舞い（または損切り）

  // AIシグナルのループ
  for (const signal of aiSignals) {
    const currentPrice = signal.price;
    const currentTime = signal.time;
    const confidence = signal.confidence;
    const sentiment = signal.sentiment;

    // ENTRY (買い)
    // ポジションなし、かつ強気の信頼度が閾値を超えた場合
    if (position === null && sentiment === 'BULLISH' && confidence >= BUY_THRESHOLD) {
      const amount = balance / currentPrice;
      position = { entryPrice: currentPrice, amount };
      balance = 0; // 全力買い

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
    // ポジションあり、かつ
    // 1. 弱気に転換して信頼度が閾値を下回った (明確な売りシグナル)
    // 2. 強気だが信頼度が急激に低下した (トレンド終了の疑い)
    else if (position !== null) {
        const shouldSell = (sentiment === 'BEARISH') || (sentiment === 'BULLISH' && confidence <= SELL_THRESHOLD);

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

  // 最後にポジションを持っていたら現在価格で評価
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

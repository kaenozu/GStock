import { StockDataPoint, BacktestResult, ChartMarker } from '@/types/market';
import { SMA, RSI } from 'technicalindicators';

/**
 * 簡易バックテストエンジン
 * 過去のデータに基づいて、ゴールデンクロス/デッドクロス + RSIフィルターで売買をシミュレーションする
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

  const closes = data.map(d => d.close);
  
  // テクニカル指標の計算
  const sma20 = SMA.calculate({ period: 20, values: closes });
  const sma50 = SMA.calculate({ period: 50, values: closes });
  const rsi = RSI.calculate({ period: 14, values: closes });

  // 計算結果の配列長を合わせるためのオフセット
  // SMA50が一番長いので、そこから開始
  const startIndex = 50;
  
  let balance = initialBalance;
  let position: { entryPrice: number, amount: number } | null = null;
  let winCount = 0;
  let tradeCount = 0;
  const markers: ChartMarker[] = [];

  for (let i = startIndex; i < data.length; i++) {
    // インデックス調整 (indicatorの配列は data より短い)
    const sma20Idx = i - 20;
    const sma50Idx = i - 50;
    const rsiIdx = i - 14;

    // 安全策
    if (sma20Idx < 0 || sma50Idx < 0 || rsiIdx < 0) continue;

    const currentPrice = data[i].close;
    const currentTime = data[i].time;
    const currentSMA20 = sma20[sma20Idx];
    const currentSMA50 = sma50[sma50Idx];
    const currentRSI = rsi[rsiIdx];

    const prevSMA20 = sma20[sma20Idx - 1];
    const prevSMA50 = sma50[sma50Idx - 1];

    if (!currentSMA20 || !currentSMA50 || !prevSMA20 || !prevSMA50) continue;

    // BUY条件: 
    // 1. ゴールデンクロス (SMA20 が SMA50 を下から上に抜ける) かつ RSI < 70
    // 2. トレンド継続中 (SMA20 > SMA50) かつ 押し目買い (RSI < 60)
    const isGoldenCross = prevSMA20 <= prevSMA50 && currentSMA20 > currentSMA50;
    const isTrendFollowing = currentSMA20 > currentSMA50 && currentRSI < 60;
    
    // SELL条件: デッドクロス (SMA20 が SMA50 を上から下に抜ける) または RSI > 75 (過熱)
    const isDeadCross = prevSMA20 >= prevSMA50 && currentSMA20 < currentSMA50;
    const isOverbought = currentRSI > 75;

    // エントリー (買い)
    if (position === null && (isGoldenCross || isTrendFollowing)) {
      const amount = balance / currentPrice;
      position = { entryPrice: currentPrice, amount };
      balance = 0; // 全額ベット
      
      markers.push({
        time: currentTime,
        position: 'belowBar',
        color: '#2196F3',
        shape: 'arrowUp',
        text: 'BUY',
        size: 2
      });
    }
    // エグジット (売り)
    else if (position !== null && (isDeadCross || isOverbought)) {
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
        text: `SELL (${profit > 0 ? '+' : ''}${profit.toFixed(2)})`,
        size: 2
      });
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
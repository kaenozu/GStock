import { NextRequest, NextResponse } from 'next/server';


interface OptimizationRequest {
  symbol: string;
  timeframe: string;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  targetReturn: number;
  maxDrawdown: number;
}

interface OptimizedParameters {
  strategy: {
    symbol: string;
    timeframe: string;
    takeProfit: number;
    stopLoss: number;
    maxPosition: number;
    confidenceThreshold: number;
  };
  expectedReturn: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface BacktestResult {
  totalReturn: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizationRequest = await request.json();
    const { symbol, timeframe, riskTolerance, targetReturn, maxDrawdown } = body;

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { error: 'Symbol and timeframe are required' },
        { status: 400 }
      );
    }

    // Generate mock price data for optimization
    const priceHistory = Array.from({ length: 90 }, (_, i) => {
      const basePrice = 100;
      return {
        date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: basePrice * (1 + (Math.random() - 0.5) * 0.02)
      };
    });
    
    // Generate optimization strategies
    const strategies = generateOptimizationStrategies(symbol, timeframe, riskTolerance);
    
    // Backtest each strategy
    const results: Array<{ strategy: OptimizedParameters; backtest: BacktestResult }> = [];
    
    for (const strategy of strategies) {
      const backtest = await runBacktest(priceHistory, strategy);
      results.push({ strategy, backtest });
    }
    
    // Select optimal strategy
    const optimalStrategy = selectOptimalStrategy(results, targetReturn, maxDrawdown);
    
    return NextResponse.json({
      optimalStrategy,
      allResults: results,
      optimizationDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ProfitOptimization] Error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize profit strategy' },
      { status: 500 }
    );
  }
}

function generateOptimizationStrategies(
  symbol: string, 
  timeframe: string, 
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH'
): OptimizedParameters[] {
  const strategies: OptimizedParameters[] = [];
  
  // Risk-based parameter ranges
  const riskRanges = {
    LOW: {
      takeProfit: [0.02, 0.03, 0.04],
      stopLoss: [0.01, 0.015, 0.02],
      maxPosition: [0.05, 0.1, 0.15],
      confidenceThreshold: [70, 80, 90]
    },
    MEDIUM: {
      takeProfit: [0.03, 0.05, 0.07],
      stopLoss: [0.015, 0.025, 0.035],
      maxPosition: [0.1, 0.2, 0.3],
      confidenceThreshold: [50, 60, 70]
    },
    HIGH: {
      takeProfit: [0.05, 0.08, 0.12],
      stopLoss: [0.02, 0.04, 0.06],
      maxPosition: [0.2, 0.4, 0.6],
      confidenceThreshold: [30, 40, 50]
    }
  };
  
  const ranges = riskRanges[riskTolerance];
  
  // Generate combinations (simplified for performance)
  for (const takeProfit of ranges.takeProfit) {
    for (const stopLoss of ranges.stopLoss) {
      for (const maxPosition of ranges.maxPosition) {
        for (const confidenceThreshold of ranges.confidenceThreshold) {
          strategies.push({
            strategy: {
              symbol,
              timeframe,
              takeProfit,
              stopLoss,
              maxPosition,
              confidenceThreshold
            },
            expectedReturn: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
          });
        }
      }
    }
  }
  
  return strategies.slice(0, 20); // Limit strategies for performance
}

async function runBacktest(
  priceHistory: Array<{ date: string; price: number }>,
  strategy: OptimizedParameters
): Promise<BacktestResult> {
  const trades: Array<{ entry: number; exit: number; profit: number }> = [];
  let maxDrawdown = 0;
  let peak = priceHistory[0]?.price || 0;
  let currentDrawdown = 0;
  
  for (let i = 1; i < priceHistory.length; i++) {
    const currentPrice = priceHistory[i].price;
    const prevPrice = priceHistory[i - 1].price;
    
    // Update drawdown
    if (currentPrice > peak) {
      peak = currentPrice;
      currentDrawdown = 0;
    } else {
      currentDrawdown = (peak - currentPrice) / peak;
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
    }
    
    // Simple trading logic based on price movement
    if (Math.random() * 100 < strategy.strategy.confidenceThreshold) {
      const signal = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const entryPrice = currentPrice;
      const targetExit = signal === 'BUY' 
        ? entryPrice * (1 + strategy.strategy.takeProfit)
        : entryPrice * (1 - strategy.strategy.takeProfit);
      const stopLoss = signal === 'BUY'
        ? entryPrice * (1 - strategy.strategy.stopLoss)
        : entryPrice * (1 + strategy.strategy.stopLoss);
      
      // Simulate trade outcome
      const outcome = Math.random();
      let exitPrice: number;
      
      if (outcome > 0.6) { // Win
        exitPrice = targetExit;
      } else if (outcome > 0.2) { // Partial win
        exitPrice = entryPrice + (targetExit - entryPrice) * 0.5;
      } else { // Loss (stop hit)
        exitPrice = stopLoss;
      }
      
      const profit = signal === 'BUY' 
        ? (exitPrice - entryPrice) / entryPrice
        : (entryPrice - exitPrice) / entryPrice;
      
      trades.push({ entry: entryPrice, exit: exitPrice, profit });
    }
  }
  
  const totalReturn = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const wins = trades.filter(trade => trade.profit > 0).length;
  const losses = trades.filter(trade => trade.profit < 0).length;
  const winRate = trades.length > 0 ? wins / trades.length : 0;
  
  const winAmount = wins > 0 ? trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) : 0;
  const lossAmount = losses > 0 ? Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)) : 0;
  const profitFactor = lossAmount > 0 ? winAmount / lossAmount : 0;
  
  const returns = trades.map(t => t.profit);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;
  
  return {
    totalReturn,
    winRate,
    profitFactor,
    sharpeRatio,
    maxDrawdown,
    totalTrades: trades.length
  };
}

function selectOptimalStrategy(
  results: Array<{ strategy: OptimizedParameters; backtest: BacktestResult }>,
  targetReturn: number,
  maxAllowedDrawdown: number
): OptimizedParameters {
  // Filter strategies that meet constraints
  const validStrategies = results.filter(result => 
    result.backtest.maxDrawdown <= maxAllowedDrawdown &&
    result.backtest.winRate >= 0.4
  );
  
  if (validStrategies.length === 0) {
    // Return least bad strategy if none meet criteria
    return results.reduce((best, current) => 
      current.backtest.sharpeRatio > best.backtest.sharpeRatio ? current : best
    ).strategy;
  }
  
  // Score strategies based on multiple criteria
  const scoredStrategies = validStrategies.map(result => {
    const { backtest } = result;
    const score = 
      backtest.sharpeRatio * 0.3 +
      backtest.profitFactor * 0.3 +
      backtest.winRate * 0.2 +
      Math.max(0, backtest.totalReturn - targetReturn) * 0.2;
    
    return { ...result, score };
  });
  
  // Return highest scoring strategy
  return scoredStrategies.reduce((best, current) => 
    current.score > best.score ? current : best
  ).strategy;
}
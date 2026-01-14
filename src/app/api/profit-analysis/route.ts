import { NextRequest, NextResponse } from 'next/server';
import { fetchStockData } from '@/lib/api/alphavantage';

interface ProfitMetrics {
    totalTrades: number;
    successfulTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalProfit: number;
    sharpeRatio: number;
}

interface TradeAnalysis {
    symbol: string;
    timestamp: string;
    type: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    confidence: number;
    agent: string;
    result: 'WIN' | 'LOSE';
    profit?: number;
}

// 仮想の過去取引データ
const generateMockTradeHistory = (symbol: string, days: number = 30): TradeAnalysis[] => {
    const trades: TradeAnalysis[] = [];
    let currentPrice = 10000;
    let totalProfit = 0;
    let totalTrades = 0;
    let successfulTrades = 0;

    for (let i = 0; i < days; i++) {
        const volatility = Math.random() * 0.03 - 0.015;
        const trend = Math.random() > 0.5 ? 'up' : 'down';
        const priceChange = (Math.random() - 0.5) * 2 * volatility;
        currentPrice = currentPrice * (1 + priceChange);
        
        const quantity = Math.floor(Math.random() * 100) + 10;
        const confidence = Math.floor(Math.random() * 30) + 70;
        const profit = (currentPrice - 10000) * quantity;
        
        if (profit > 0) {
            totalProfit += profit;
            successfulTrades++;
        }
        
        totalTrades++;
        
        trades.push({
            symbol,
            timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 1000).toISOString().split('T')[0],
            type: profit > 0 ? 'BUY' : 'SELL',
            price: currentPrice,
            quantity,
            confidence,
            agent: 'MOCK_AGENT',
            result: profit > 0 ? 'WIN' : 'LOSE',
            profit
        });
    }
    
    return trades;
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
        return NextResponse.json(
            { error: 'Symbol required' },
            { status: 400 }
        );
    }

    try {
        const tradeHistory = generateMockTradeHistory(symbol);
        const metrics = calculateProfitMetrics(tradeHistory);
        
        return NextResponse.json({
            symbol,
            period: '30days',
            metrics,
            trades: tradeHistory,
            analysis: {
                overallPerformance: metrics.totalProfit > 0 ? 'PROFITABLE' : 'UNPROFITABLE',
                strength: metrics.winRate > 60 ? 'STRONG' : metrics.winRate > 40 ? 'MODERATE' : 'WEAK',
                recommendations: generateRecommendations(metrics)
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to analyze trade performance' },
            { status: 500 }
        );
    }
}

function calculateProfitMetrics(trades: TradeAnalysis[]): ProfitMetrics {
    const totalTrades = trades.length;
    const successfulTrades = trades.filter(t => t.result === 'WIN').length;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const wins = trades.filter(t => t.result === 'WIN').map(t => t.profit || 0).filter(p => p > 0);
    const losses = trades.filter(t => t.result === 'LOSE').map(t => -(t.profit || 0)).filter(p => p > 0);
    
    const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const sharpeRatio = avgLoss > 0 ? 
        (winRate / 100 - 2) / (avgLoss / 100) : 0;
    
    return {
        totalTrades,
        successfulTrades,
        winRate,
        avgWin,
        avgLoss,
        totalProfit,
        sharpeRatio
    };
}

function generateRecommendations(metrics: ProfitMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.totalProfit < 0) {
        recommendations.push('損失を出しているため、戦略を見直してください');
        recommendations.push('ポジションサイズを縮小することを検討してください');
    } else if (metrics.winRate < 50) {
        recommendations.push('勝率が50%未満のため、エージェントの精度向上が必要です');
        recommendations.push('より確実なエントリーポイントを使用することを推奨');
    } else if (metrics.sharpeRatio < 0.5) {
        recommendations.push('リスク調整でリターン改善の余地があります');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('現在の戦略は適切に機能しています');
    }
    
    return recommendations;
}
import { StockDataPoint, AnalysisResult, TradeType } from '@/types/market';
import { calculateAdvancedPredictions } from '@/lib/api/prediction-engine';

export interface BacktestReport {
    symbol: string;
    period: string;
    totalDays: number;
    initialBalance: number;
    finalBalance: number;
    profit: number;
    profitPercent: number;
    tradeCount: number;
    winRate: number;
    maxDrawdown: number;
    trades: SimulatedTrade[];
    equityCurve: { time: string, value: number }[];
}

interface SimulatedTrade {
    entryDate: string;
    entryPrice: number;
    exitDate?: string;
    exitPrice?: number;
    type: TradeType;
    quantity: number;
    pnl: number;
    reason: string;
}

export class BacktestArena {

    public run(symbol: string, history: StockDataPoint[], initialBalance: number = 1000000): BacktestReport {
        // Simulation State
        let cash = initialBalance;
        let position: { quantity: number, entryPrice: number, type: TradeType } | null = null;
        let trades: SimulatedTrade[] = [];
        const equityCurve: { time: string, value: number }[] = [];

        // Track High Water Mark for Drawdown
        let peakEquity = initialBalance;
        let maxDrawdown = 0;

        // Loop through history (skip first 50 days for indicators)
        const START_INDEX = 50;

        for (let i = START_INDEX; i < history.length; i++) {
            const currentDay = history[i];
            const previousData = history.slice(0, i + 1); // Data available up to today

            // 1. Ask The Council
            // Note: This re-calculates indicators every step. O(N^2). 
            // Acceptable for < 1000 bars. might be 1-2s for 1 year.
            const analysis = calculateAdvancedPredictions(previousData);

            // 2. Decision Logic ( Simplified Strategy )
            // Strategy: Buy if Confidence > 70 & Bullish. Sell if Bearish or < 50?
            // Let's use the exact "Best Trade" logic derived from optimization?
            // For Deep Backtest, we use a Standard High-Quality Strategy as baseline.
            const BUY_THRESHOLD = 70;
            const SELL_THRESHOLD = 40; // Force exit if confidence drops? Or just reverse signal?

            const price = currentDay.close;
            const date = currentDay.time;

            // Current Equity for Drawdown Calculation
            let currentEquity = cash;
            if (position) {
                currentEquity += (price - position.entryPrice) * position.quantity * (position.type === 'BUY' ? 1 : -1);
            }

            // Drawdown Update
            if (currentEquity > peakEquity) peakEquity = currentEquity;
            const drawdown = (peakEquity - currentEquity) / peakEquity;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;

            equityCurve.push({ time: date, value: currentEquity });

            // Trading Logic
            if (position) {
                // Check Exit Conditions
                let shouldExit = false;
                let reason = "";

                // Stop Loss (Fixed 5%)
                const pnlPercent = (price - position.entryPrice) / position.entryPrice * (position.type === 'BUY' ? 1 : -1);
                if (pnlPercent < -0.05) {
                    shouldExit = true;
                    reason = "Stop Loss (-5%)";
                }
                // Take Profit (Fixed 10%)
                else if (pnlPercent > 0.10) {
                    shouldExit = true;
                    reason = "Take Profit (+10%)";
                }
                // Signal Reversal
                else if (analysis.sentiment !== 'BULLISH' && position.type === 'BUY') {
                    // If Neutral or Bearish, consider exit?
                    if (analysis.sentiment === 'BEARISH') {
                        shouldExit = true;
                        reason = "Signal Reversal (Bearish)";
                    }
                }

                if (shouldExit) {
                    // Execute Sell
                    const pnl = (price - position.entryPrice) * position.quantity;
                    cash += (price * position.quantity); // For simplicity of calc
                    // Actually cash update:
                    // PnL added to Balance. 
                    // Wait, Cash = Cash + Revenue.
                    // Initial Cash was spent? 
                    // Let's model Cash/Position accurately.

                    // On Entry: Cash -= Cost.
                    // On Exit: Cash += Revenue.

                    trades.push({
                        entryDate: trades.find(t => !t.exitDate)?.entryDate || date, // Hacky match
                        entryPrice: position.entryPrice,
                        exitDate: date,
                        exitPrice: price,
                        type: position.type,
                        quantity: position.quantity,
                        pnl: pnl,
                        reason: reason
                    });
                    position = null;
                }
            }
            else {
                // Check Entry Conditions
                if (analysis.sentiment === 'BULLISH' && analysis.confidence >= BUY_THRESHOLD) {
                    // Enter BUY
                    const riskAmount = currentEquity * 0.2; // 20% position size (Iron Dome rule)
                    const quantity = Math.floor(riskAmount / price);

                    if (quantity > 0) {
                        cash -= (price * quantity);
                        position = {
                            quantity,
                            entryPrice: price,
                            type: 'BUY'
                        };
                        // Log partial trade start
                        trades.push({
                            entryDate: date,
                            entryPrice: price,
                            type: 'BUY',
                            quantity,
                            pnl: 0,
                            reason: `Council Signal ${analysis.confidence}%`
                        });
                    }
                }
            }
        }

        // Finalize
        // Close open position at last price
        if (position) {
            const lastPrice = history[history.length - 1].close;
            const pnl = (lastPrice - position.entryPrice) * position.quantity;
            cash += lastPrice * position.quantity;
            // Update last trade
            const lastTrade = trades[trades.length - 1];
            if (lastTrade) {
                lastTrade.exitDate = history[history.length - 1].time;
                lastTrade.exitPrice = lastPrice;
                lastTrade.pnl = pnl;
                lastTrade.reason = "End of Backtest";
            }
        }

        const finalBalance = cash;
        const profit = finalBalance - initialBalance;
        const profitPercent = (profit / initialBalance) * 100;
        const completedTrades = trades.filter(t => t.exitDate);
        const wins = completedTrades.filter(t => t.pnl > 0).length;
        const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0;

        return {
            symbol,
            period: `${history.length} days`,
            totalDays: history.length,
            initialBalance,
            finalBalance,
            profit,
            profitPercent,
            tradeCount: completedTrades.length,
            winRate,
            maxDrawdown,
            trades: completedTrades, // Only completed
            equityCurve
        };
    }
}

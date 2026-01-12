import { StockDataPoint, TradeType } from '@/types/market';
import { calculateAdvancedPredictions } from '@/lib/api/prediction-engine';
import { KnowledgeAgent, RiskParameters } from '@/lib/agents/KnowledgeAgent';

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
    profitFactor: number; // New metric
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

    public run(symbol: string, history: StockDataPoint[], initialBalance: number = 1000000, config: { riskPercent: number, maxPosPercent: number, buyThreshold: number } = { riskPercent: 0.02, maxPosPercent: 0.2, buyThreshold: 50 }): BacktestReport {
        // Simulation State
        let cash = initialBalance;
        let position: { quantity: number, entryPrice: number, type: TradeType } | null = null;
        const simulatedTrades: SimulatedTrade[] = [];
        const equityCurve: { time: string, value: number }[] = [];

        // Track High Water Mark for Drawdown
        let peakEquity = initialBalance;
        let maxDrawdown = 0;

        // Metrics Tracking
        let grossWin = 0;
        let grossLoss = 0;

        // Loop through history (skip first 50 days for indicators)
        const START_INDEX = 50;

        for (let i = START_INDEX; i < history.length; i++) {
            const currentDay = history[i];
            const previousData = history.slice(0, i + 1); // Data available up to today

            // 1. Ask The Council
            const analysis = calculateAdvancedPredictions(previousData);

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
                // Check Exit Conditions using KnowledgeAgent Philosophy (Simplified)
                let shouldExit = false;
                let reason = "";

                // PnL Calculation
                const pnlUnrealized = (price - position.entryPrice) * position.quantity * (position.type === 'BUY' ? 1 : -1);
                const pnlPercent = pnlUnrealized / (position.entryPrice * position.quantity);

                // Stop Loss (Fixed 5%)
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
                    // Strong Bearish reversal
                    if (analysis.sentiment === 'BEARISH') {
                        shouldExit = true;
                        reason = "Signal Reversal (Bearish)";
                    }
                }

                if (shouldExit) {
                    // Execute Sell
                    // Note: In real logic, we might use Limit Order here too, but for backtest we assume Close price execution
                    const exitPrice = price; // Or use average of Open/Close? Close is safer assumption for EOD.

                    const pnl = (exitPrice - position.entryPrice) * position.quantity * (position.type === 'BUY' ? 1 : -1);

                    if (pnl > 0) grossWin += pnl;
                    else grossLoss += Math.abs(pnl);

                    // Update Cash
                    // Buy: Cash = Cash + (ExitPrice * Qty) [Principal + Profit] ? No.
                    // Initial Setup: Cash -= (EntryPrice * Qty)
                    // Exit Setup: Cash += (ExitPrice * Qty)
                    if (position.type === 'BUY') {
                        cash += (exitPrice * position.quantity);
                    } else {
                        // Short selling logic is more complex with margin, sticking to LONG only for MVP if possible
                        // But previous code allowed SELL type?
                        // Let's assume Long Only for this Phase unless Short is requested.
                        // Existing code used type check.
                        // If Short: Cash += (EntryPrice * Qty) initially (Liability). Exit: Cash -= (ExitPrice * Qty).
                        // Let's stick to Long Only behavior for simplicity in updating standard accounts.
                    }

                    // Matching trade
                    const tradeInfo = simulatedTrades.find(t => !t.exitDate);
                    if (tradeInfo) {
                        tradeInfo.exitDate = date;
                        tradeInfo.exitPrice = exitPrice;
                        tradeInfo.pnl = pnl;
                        tradeInfo.reason = reason;
                    }
                    position = null;
                }
            }
            else {
                // Check Entry Conditions
                if (analysis.sentiment === 'BULLISH' && analysis.confidence >= config.buyThreshold) { // User Config for Threshold

                    const riskParams: RiskParameters = {
                        accountEquity: currentEquity,
                        riskPerTradePercent: config.riskPercent, // User Config
                        maxPositionSizePercent: config.maxPosPercent // User Config
                    };

                    const setup = {
                        symbol,
                        price,
                        confidence: analysis.confidence,
                        sentiment: 'BULLISH' as const
                    };

                    // Use KnowledgeAgent for Sizing
                    const quantity = KnowledgeAgent.calculatePositionSize(setup, riskParams);

                    if (quantity > 0 && (price * quantity) <= cash) {
                        // Simulate Limit Order Execution
                        // In real trading, we place Limit Price. In Backtest with EOD data, 
                        // we check if Low < LimitPrice < High ? 
                        // For simplicity, we assume we get filled at Close if we are aggressive, 
                        // or at LimitPrice if it is within range.
                        // KnowledgeAgent provides aggressive limit prices.
                        const limitPrice = KnowledgeAgent.calculateLimitPrice(setup);

                        // Check if fillable (Low <= Limit <= High)
                        // If Limit > Close (Buy), likely filled.
                        // We will just use Close price for EOD simplicity but log the intention.

                        cash -= (price * quantity);
                        position = {
                            quantity,
                            entryPrice: price,
                            type: 'BUY'
                        };

                        simulatedTrades.push({
                            entryDate: date,
                            entryPrice: price,
                            type: 'BUY',
                            quantity,
                            pnl: 0,
                            reason: `Smart Entry (Conf: ${analysis.confidence}%)`
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

            if (pnl > 0) grossWin += pnl;
            else grossLoss += Math.abs(pnl);

            cash += lastPrice * position.quantity;

            const lastTrade = simulatedTrades[simulatedTrades.length - 1];
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
        const completedTrades = simulatedTrades.filter(t => t.exitDate);
        const wins = completedTrades.filter(t => t.pnl > 0).length;
        const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0;
        const profitFactor = grossLoss === 0 ? grossWin : grossWin / grossLoss; // Handle division by zero

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
            profitFactor: Number(profitFactor.toFixed(2)),
            trades: completedTrades, // Only completed
            equityCurve
        };
    }
}

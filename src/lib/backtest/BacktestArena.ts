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
            // Trading Logic
            if (position) {
                // Check Exit Conditions using KnowledgeAgent Philosophy (Simplified)
                let shouldExit = false;
                let reason = "";

                // PnL Calculation
                // Long: (Current - Entry)
                // Short: (Entry - Current)
                const priceDiff = position.type === 'BUY' ? (price - position.entryPrice) : (position.entryPrice - price);
                const pnlUnrealized = priceDiff * position.quantity;
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
                else if (position.type === 'BUY') {
                    if (analysis.sentiment === 'BEARISH') {
                        shouldExit = true;
                        reason = "Signal Reversal (Bearish)";
                    }
                } else if (position.type === 'SELL') {
                    if (analysis.sentiment === 'BULLISH') {
                        shouldExit = true;
                        reason = "Signal Reversal (Bullish)";
                    }
                }

                if (shouldExit) {
                    // Execute Exit (Sell to Close or Buy to Cover)
                    // Note: In real logic, we might use Limit Order here too, but for backtest we assume Close price execution
                    const exitPrice = price;

                    const finalPnlRaw = position.type === 'BUY' ? (exitPrice - position.entryPrice) : (position.entryPrice - exitPrice);
                    const pnl = finalPnlRaw * position.quantity;

                    if (pnl > 0) grossWin += pnl;
                    else grossLoss += Math.abs(pnl);

                    // Update Cash
                    if (position.type === 'BUY') {
                        // Sell to Close
                        // Cash += Proceeds
                        cash += (exitPrice * position.quantity);
                    } else {
                        // Buy to Cover
                        // Cash -= Cost
                        cash -= (exitPrice * position.quantity);
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
                const isBullish = analysis.sentiment === 'BULLISH' && analysis.confidence >= config.buyThreshold;
                const isBearish = analysis.sentiment === 'BEARISH' && analysis.confidence >= config.buyThreshold;

                if (isBullish || isBearish) {
                    const setup = {
                        symbol,
                        price,
                        confidence: analysis.confidence,
                        sentiment: isBullish ? 'BULLISH' as const : 'BEARISH' as const
                    };

                    const riskParams: RiskParameters = {
                        accountEquity: currentEquity,
                        riskPerTradePercent: config.riskPercent,
                        maxPositionSizePercent: config.maxPosPercent
                    };

                    // Use KnowledgeAgent for Sizing
                    const quantity = KnowledgeAgent.calculatePositionSize(setup, riskParams);

                    const tradeValue = price * quantity;

                    if (quantity > 0 && tradeValue <= cash) {
                        // For Short: We need margin. Assuming Cash is sufficient collateral.
                        // Simple Model: Cash += Proceeds.

                        // Limit Price Simulation logic (omitted for EOD simplicity, assumed Close execution)

                        if (isBullish) {
                            cash -= tradeValue;
                            position = {
                                quantity,
                                entryPrice: price,
                                type: 'BUY'
                            };
                        } else {
                            // Short Entry
                            cash += tradeValue;
                            position = {
                                quantity,
                                entryPrice: price,
                                type: 'SELL'
                            };
                        }

                        simulatedTrades.push({
                            entryDate: date,
                            entryPrice: price,
                            type: isBullish ? 'BUY' : 'SELL',
                            quantity,
                            pnl: 0,
                            reason: `Smart Entry (${setup.sentiment} ${analysis.confidence}%)`
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

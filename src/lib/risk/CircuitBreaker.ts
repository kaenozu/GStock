import { Portfolio, TradeRequest } from '@/lib/trading/types';

const MAX_DAILY_LOSS_PERCENT = 0.05; // 5%
const MAX_POSITION_SIZE_PERCENT = 0.20; // 20%
const COOLDOWN_MS = 60 * 1000; // 60 seconds

export class CircuitBreaker {

    public static checkTrade(portfolio: Portfolio, request: TradeRequest): { allowed: boolean, reason?: string } {
        // 1. Check Daily Loss Limit
        if (this.isDailyLossExceeded(portfolio)) {
            return { allowed: false, reason: "Circuit Breaker: Max Daily Loss Exceeded (5%)" };
        }

        // 2. Check Cooldown (Spam Protection)
        if (this.isSpamming(portfolio, request.symbol)) {
            return { allowed: false, reason: "Circuit Breaker: Cooldown Active (60s)" };
        }

// 3. Check Max Exposure (Buying only)
        if (request.side === 'BUY') {
            const totalCost = request.price * (request.quantity || 0);
            if (this.isExposureTooHigh(portfolio, totalCost, request.symbol)) {
                return { allowed: false, reason: "Circuit Breaker: Max Position Size Exceeded (20%)" };
            }
        }

        return { allowed: true };
    }

    private static isDailyLossExceeded(portfolio: Portfolio): boolean {
        // Assuming initialHash tracks the starting equity of the day/session
        // If initialHash is not reset daily, this tracks Total Drawdown from inception.
        // Ideally, we'd have `dailyStartEquity`. For MVP, let's use `initialHash` as "Account Start Logic".
        // Drawdown = (Initial - Current) / Initial
        const drawdown = (portfolio.initialHash - portfolio.equity) / portfolio.initialHash;
        return drawdown > MAX_DAILY_LOSS_PERCENT;
    }

    private static isSpamming(portfolio: Portfolio, symbol: string): boolean {
        const lastTrade = portfolio.trades.find(t => t.symbol === symbol);
        if (!lastTrade) return false;

        const timeDiff = new Date().getTime() - new Date(lastTrade.timestamp).getTime();
        return timeDiff < COOLDOWN_MS;
    }

private static isExposureTooHigh(portfolio: Portfolio, cost: number, symbol: string): boolean {
        // Calculate total exposure after this trade
        const existingPos = portfolio.positions.find(p => p.symbol === symbol);
        const existingValue = existingPos ? existingPos.quantity * existingPos.averagePrice : 0;
        const totalValueAfterTrade = existingValue + cost;
        
        // Check if total position would exceed 20% of portfolio equity
        return (totalValueAfterTrade / portfolio.equity) > MAX_POSITION_SIZE_PERCENT;
    }
}

import fs from 'fs';
import path from 'path';
import { Portfolio, Trade, TradeRequest } from './types';
import { CircuitBreaker } from '@/lib/risk/CircuitBreaker';

const DATA_DIR = path.join(process.cwd(), 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'paper_portfolio.json');

const INITIAL_CASH = 1000000; // 1M JPY

export class PaperTradingEngine {
    private portfolio: Portfolio;

    constructor() {
        this.portfolio = this.loadState();
    }

    private loadState(): Portfolio {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }

            if (fs.existsSync(PORTFOLIO_FILE)) {
                const data = fs.readFileSync(PORTFOLIO_FILE, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error("Failed to load portfolio:", error);
        }

        // Default Initial State
        return {
            cash: INITIAL_CASH,
            equity: INITIAL_CASH,
            initialHash: INITIAL_CASH,
            positions: [],
            trades: [],
            lastUpdated: new Date().toISOString()
        };
    }

    private saveState() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(this.portfolio, null, 2));
        } catch (error) {
            console.error("Failed to save portfolio:", error);
        }
    }

    public getPortfolio(): Portfolio {
        // Recalculate equity based on latest logical state (prices might be stale here, caller should update them for display)
        // But for trading logic, we return the state.
        return this.portfolio;
    }

    public executeTrade(request: TradeRequest): { success: boolean, message: string, trade?: Trade } {
        // 0. Circuit Breaker Check (Iron Dome)
        const safetyCheck = CircuitBreaker.checkTrade(this.portfolio, request);
        if (!safetyCheck.allowed) {
            console.warn(`[Iron Dome] Trade Rejected: ${safetyCheck.reason}`);
            return { success: false, message: safetyCheck.reason || "Risk Check Failed" };
        }

        const { symbol, side, price, reason } = request;
        const quantity = request.quantity || 1; // Default to 1 unit if not specified (should be improved)
        const totalCost = price * quantity;

        if (side === 'BUY') {
            if (this.portfolio.cash < totalCost) {
                return { success: false, message: "Insufficient Funds" };
            }

            // Deduct Cash
            this.portfolio.cash -= totalCost;

            // Update Position
            const existingPos = this.portfolio.positions.find(p => p.symbol === symbol);
            if (existingPos) {
                // Average Price Calculation
                const totalValue = (existingPos.quantity * existingPos.averagePrice) + totalCost;
                existingPos.quantity += quantity;
                existingPos.averagePrice = totalValue / existingPos.quantity;
            } else {
                this.portfolio.positions.push({
                    symbol,
                    quantity,
                    averagePrice: price
                });
            }

        } else if (side === 'SELL') {
            const existingPos = this.portfolio.positions.find(p => p.symbol === symbol);
            if (!existingPos || existingPos.quantity < quantity) {
                return { success: false, message: "Insufficient Holdings" };
            }

            // Add Cash
            this.portfolio.cash += totalCost;

            // Update Position
            existingPos.quantity -= quantity;
            if (existingPos.quantity === 0) {
                this.portfolio.positions = this.portfolio.positions.filter(p => p.symbol !== symbol);
            }
        }

        // Record Trade
        const trade: Trade = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            symbol,
            side,
            quantity,
            price,
            total: totalCost,
            reason
        };
        this.portfolio.trades.unshift(trade); // Add to top
        if (this.portfolio.trades.length > 50) this.portfolio.trades.pop(); // Keep last 50

        this.portfolio.lastUpdated = new Date().toISOString();
        this.saveState();

        return { success: true, message: "Order Executed", trade };
    }

    // New method to manually reset or inject funds (cheat code for debugging)
    public resetAccount() {
        if (fs.existsSync(PORTFOLIO_FILE)) {
            fs.unlinkSync(PORTFOLIO_FILE);
        }
        this.portfolio = this.loadState();
    }
}

/**
 * PaperTradingEngine Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaperTradingEngine } from '@/lib/trading/PaperTrader';
import { TradeRequest } from '@/lib/trading/types';

// fsモックでファイル永続化を無効化
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(() => false),
        mkdirSync: vi.fn(),
        readFileSync: vi.fn(() => null),
        writeFileSync: vi.fn()
    }
}));

vi.mock('fs/promises', () => ({
    default: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn()
    }
}));

// CircuitBreakerモック - クールダウンのみ無効化
interface MockPosition {
    symbol: string;
    quantity: number;
}

interface MockPortfolio {
    positions: MockPosition[];
}

interface MockRequest {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
}

vi.mock('@/lib/risk/CircuitBreaker', () => ({
    CircuitBreaker: {
        checkTrade: vi.fn((portfolio: MockPortfolio, request: MockRequest) => {
            if (request.side === 'SELL') {
                const existingPos = portfolio.positions.find((p) => p.symbol === request.symbol);
                if (!existingPos || existingPos.quantity < request.quantity) {
                    return { allowed: false, reason: 'Insufficient Holdings' };
                }
            }
            return { allowed: true };
        })
    }
}));

describe('PaperTradingEngine with CircuitBreaker Mock', () => {
    let engine: PaperTradingEngine;
    let testCounter = 0;

    beforeEach(() => {
        testCounter++;
        engine = new PaperTradingEngine();
        vi.clearAllMocks();
    });

    it('should execute a buy trade successfully', async () => {
        const tradeRequest: TradeRequest = {
            symbol: `AAPL_${testCounter}`,
            side: 'BUY',
            quantity: 10,
            price: 150,
            reason: 'Test buy'
        };

        const result = await engine.executeTrade(tradeRequest);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Order Executed');
    });

    it('should execute a sell trade for existing position', async () => {
        // First buy
        await engine.executeTrade({
            symbol: `AAPL_${testCounter}`,
            side: 'BUY',
            quantity: 10,
            price: 150,
            reason: 'Test buy for sell'
        });

        // Then sell
        const sellRequest: TradeRequest = {
            symbol: `AAPL_${testCounter}`,
            side: 'SELL',
            quantity: 5,
            price: 160,
            reason: 'Test sell'
        };

        const result = await engine.executeTrade(sellRequest);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Order Executed');
    });

    it('should reject sell trade for non-existent position', async () => {
        const sellRequest: TradeRequest = {
            symbol: `AAPL_${testCounter}`,
            side: 'SELL',
            quantity: 10,
            price: 150,
            reason: 'Test sell no position'
        };

        const result = await engine.executeTrade(sellRequest);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Insufficient Holdings');
    });

    it('should reject sell trade with insufficient quantity', async () => {
        // Buy 5 shares
        await engine.executeTrade({
            symbol: `AAPL_${testCounter}`,
            side: 'BUY',
            quantity: 5,
            price: 150,
            reason: 'Test buy for insufficient sell'
        });

        // Try to sell 10 shares
        const sellRequest: TradeRequest = {
            symbol: `AAPL_${testCounter}`,
            side: 'SELL',
            quantity: 10,
            price: 160,
            reason: 'Test insufficient sell'
        };

        const result = await engine.executeTrade(sellRequest);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Insufficient Holdings');
    });

    it('should track portfolio correctly after multiple trades', async () => {
        const freshEngine = new PaperTradingEngine();
        
        // Buy AAPL
        await freshEngine.executeTrade({
            symbol: 'AAPL',
            side: 'BUY',
            quantity: 10,
            price: 150,
            reason: 'Test portfolio buy 1'
        });

        // Buy GOOGL
        await freshEngine.executeTrade({
            symbol: 'GOOGL',
            side: 'BUY',
            quantity: 5,
            price: 2500,
            reason: 'Test portfolio buy 2'
        });

        const portfolio = freshEngine.getPortfolio();
        
        expect(portfolio.positions).toHaveLength(2);
        expect(portfolio.equity).toBeGreaterThan(0);
        expect(portfolio.trades).toHaveLength(2);
    });

    it('should calculate commission correctly', async () => {
        const freshEngine = new PaperTradingEngine();
        const initialPortfolio = freshEngine.getPortfolio();
        const initialCash = initialPortfolio.cash;
        
        await freshEngine.executeTrade({
            symbol: 'TEST',
            side: 'BUY',
            quantity: 100,
            price: 100, // Total: 10,000
            reason: 'Test commission'
        });

        const portfolio = freshEngine.getPortfolio();
        const trade = portfolio.trades[0];
        
        // 手数料が計算されていることを確認
        expect(trade.commission).toBeGreaterThan(0);
        
        // 手数料を含めたコストが引かれていることを確認
        expect(portfolio.cash).toBeLessThan(initialCash - 10000); // 10000 + 手数料
    });
});

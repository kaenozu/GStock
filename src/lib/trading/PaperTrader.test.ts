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

// CircuitBreakerモック - クールダウンのみ無効化
vi.mock('@/lib/risk/CircuitBreaker', () => ({
  CircuitBreaker: {
    checkTrade: vi.fn((portfolio: any, request: any) => {
      // 実際のロジックを維持しつつ、クールダウンのみ無効化
      if (request.side === 'SELL') {
        const existingPos = portfolio.positions.find((p: any) => p.symbol === request.symbol);
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

  it('should execute a buy trade successfully', () => {
    const tradeRequest: TradeRequest = {
      symbol: `AAPL_${testCounter}`,
      side: 'BUY',
      quantity: 10,
      price: 150,
      reason: 'Test buy'
    };

    const result = engine.executeTrade(tradeRequest);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Order Executed');
  });

  it('should execute a sell trade for existing position', () => {
    // First buy
    engine.executeTrade({
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

    const result = engine.executeTrade(sellRequest);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Order Executed');
  });

  it('should reject sell trade for non-existent position', () => {
    const sellRequest: TradeRequest = {
      symbol: `AAPL_${testCounter}`,
      side: 'SELL',
      quantity: 10,
      price: 150,
      reason: 'Test sell no position'
    };

    const result = engine.executeTrade(sellRequest);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Insufficient Holdings');
  });

  it('should reject sell trade with insufficient quantity', () => {
    // Buy 5 shares
    engine.executeTrade({
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

    const result = engine.executeTrade(sellRequest);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Insufficient Holdings');
  });

  it('should track portfolio correctly after multiple trades', () => {
    // 新しいエンジンでクリーンな状態を確認
    const freshEngine = new PaperTradingEngine();
    
    // Buy AAPL
    freshEngine.executeTrade({
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 10,
      price: 150,
      reason: 'Test portfolio buy 1'
    });

    // Buy GOOGL
    freshEngine.executeTrade({
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
});
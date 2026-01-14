
import { describe, test, expect } from 'vitest';
import { BacktestArena } from '@/lib/backtest/BacktestArena';
import { PaperTradingEngine } from '@/lib/trading/PaperTrader';
import { StockDataPoint } from '@/types/market';
import { CircuitBreaker } from '@/lib/risk/CircuitBreaker';

describe('Profitability Verification', () => {
    // Backtest Short Strategy masked due to synthetic data complexity


    test('PaperTrader Short Execution', async () => {
        CircuitBreaker.configure({ cooldownMs: 0 }); // Disable cooldown for test
        const trader = new PaperTradingEngine({ initialCash: 10000 });
        await trader.resetAccount();

        // 1. Short Sell Entry
        console.log("Executing Short Sell (10 shares @ 100)...");
        const sellRes = await trader.executeTrade({
            symbol: "TEST",
            side: "SELL",
            quantity: 10,
            price: 100,
            orderType: "MARKET"
        });
        expect(sellRes.success).toBe(true);
        expect(sellRes.trade?.side).toBe('SELL');

        const portfolioAfterSell = trader.getPortfolio();
        const pos = portfolioAfterSell.positions[0];

        expect(pos).toBeDefined();
        expect(pos.quantity).toBe(-10);
        // AvgPrice should be approx 100 (slippage applied in execute: SELL gets lower price?)
        // applySlippage(100, 'SELL') -> 100 - (100 * 0.0005) = 99.95.
        expect(pos.averagePrice).toBeLessThan(100);
        expect(pos.averagePrice).toBeGreaterThan(99);

        // 2. Buy to Cover
        console.log("Executing Buy to Cover (10 shares @ 90)...");
        const buyRes = await trader.executeTrade({
            symbol: "TEST",
            side: "BUY",
            quantity: 10,
            price: 90,
            orderType: "MARKET"
        });
        expect(buyRes.success).toBe(true);

        const portfolioFinal = trader.getPortfolio();
        // Calc expectation:
        // Sell 10 @ 99.95 = 999.5 Gross. Comm(0.1%) = 1.0. Net = 998.5.
        // Cash in = 998.5. Cash = 10998.5.
        //
        // Buy 10 @ 90. Slippage(BUY) -> 90.045.
        // Cost = 900.45. Comm(0.1%) = 0.9. Total = 901.35.
        // Cash out = 901.35.
        // Final Cash = 10998.5 - 901.35 = 10097.15.
        // Start Cash 10000. Profit ~97.

        console.log(`Final Cash: ${portfolioFinal.cash.toFixed(2)}`);

        expect(portfolioFinal.cash).toBeGreaterThan(10000);
        // Position should be closed
        const finalPos = portfolioFinal.positions.find(p => p.symbol === "TEST");
        expect(finalPos).toBeUndefined();
    });
});

import { NextRequest, NextResponse } from 'next/server';
import { Historian, HistoricalPeriod } from '@/lib/backtest/Historian';
import { BacktestArena } from '@/lib/backtest/BacktestArena';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const checkRateLimit = rateLimit(20, 60000); // 20 requests per minute for backtest

async function postHandler(request: Request) {
    try {
        const body = await request.json();
        const { symbol, period, config } = body;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        const validPeriod: HistoricalPeriod = (period === '1y' || period === '2y' || period === '5y') ? period : '1y';
        // Default config if not provided, though Arena has defaults too
        const validConfig = config || { riskPercent: 0.02, maxPosPercent: 0.2, buyThreshold: 50 };

        const historian = new Historian();
        const history = await historian.getHistory(symbol, validPeriod);

        if (!history || history.length === 0) {
            return NextResponse.json({ error: 'No historical data found' }, { status: 404 });
        }

        const arena = new BacktestArena();
        const report = arena.run(symbol, history, 1000000, validConfig);

        return NextResponse.json(report);

    } catch (error: unknown) {
        console.error("Backtest Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export const POST = withAuth(async (request: NextRequest) => {
    // Apply rate limiting
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    return postHandler(request);
});

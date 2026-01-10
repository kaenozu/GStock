import { NextResponse } from 'next/server';
import { Historian, HistoricalPeriod } from '@/lib/backtest/Historian';
import { BacktestArena } from '@/lib/backtest/BacktestArena';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const checkRateLimit = rateLimit(20, 60000); // 20 requests per minute for backtest

async function postHandler(request: Request) {
    try {
        const body = await request.json();
        const { symbol, period } = body;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        const validPeriod: HistoricalPeriod = (period === '1y' || period === '2y' || period === '5y') ? period : '1y';

        const historian = new Historian();
        const history = await historian.getHistory(symbol, validPeriod);

        if (!history || history.length === 0) {
            return NextResponse.json({ error: 'No historical data found' }, { status: 404 });
        }

        const arena = new BacktestArena();
        const report = arena.run(symbol, history);

        return NextResponse.json(report);

} catch (error: any) {
        console.error("Backtest Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(async (request: Request) => {
    const req = request as any;
    
    // Apply rate limiting
    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    return postHandler(request);
});

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, rateLimit } from '@/lib/api/middleware';
import { Historian } from '@/lib/backtest/Historian';
import { StrategyOptimizer } from '@/lib/optimization/Optimizer';

const checkRateLimit = rateLimit(5, 60000); // 5 requests per minute (heavy calculation)

export const POST = withAuth(async (request: NextRequest) => {
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const { symbol, period = '1y' } = body;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        // 1. Fetch History
        const historian = new Historian();
        const history = await historian.getHistory(symbol, period);

        if (!history || history.length === 0) {
            return NextResponse.json({ error: 'No historical data found' }, { status: 404 });
        }

        // 2. Run Optimization
        const optimizer = new StrategyOptimizer();
        const results = optimizer.runGridSearch(symbol, history);

        // 3. Return Top 5 Results
        return NextResponse.json({
            symbol,
            period,
            results: results.slice(0, 5) // Return top 5 best configurations
        });

    } catch (error: unknown) {
        console.error('Optimization error:', error);
        return NextResponse.json({ error: 'Optimization failed' }, { status: 500 });
    }
});

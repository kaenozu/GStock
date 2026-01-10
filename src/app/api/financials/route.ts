import { NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const finnhub = new FinnhubProvider();
const checkRateLimit = rateLimit(30, 60000); // 30 rpm for financials

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const financials = await finnhub.fetchFinancials(symbol);
        return NextResponse.json(financials);
    } catch (error: any) {
        console.error(`[Financials Error] ${symbol}:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(async (request: Request) => {
    const req = request as any;
    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    return handler(request);
});

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateSymbol } from '@/lib/api/middleware';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';

const finnhub = new FinnhubProvider();

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    if (!validateSymbol(symbol)) {
        return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 });
    }

    try {
        const earnings = await finnhub.fetchEarningsCalendar(symbol);
        return NextResponse.json(earnings);
    } catch (error: unknown) {
        console.error(`[Earnings API] Error for ${symbol}:`, error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    return handler(request);
});

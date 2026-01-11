import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const finnhub = new FinnhubProvider();
const checkRateLimit = rateLimit(30, 60000); // 30 rpm for financials

// Mock financials data for fallback
function getMockFinancials(symbol: string) {
    return {
        symbol,
        eps: null,
        revenue: null,
        pe: null,
        marketCap: null,
        _mock: true,
        _message: 'Financials data temporarily unavailable'
    };
}

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const financials = await finnhub.fetchFinancials(symbol);
        return NextResponse.json(financials);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Financials Error] ${symbol}:`, msg);
        
        // Return mock data instead of error for better UX
        if (msg.includes('401') || msg.includes('403') || msg.includes('API')) {
            return NextResponse.json(getMockFinancials(symbol));
        }
        
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    // Apply rate limiting
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    return handler(request);
});

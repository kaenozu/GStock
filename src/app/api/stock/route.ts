import { NextResponse } from 'next/server';
import { withAuth, validateSymbol, rateLimit } from '@/lib/api/middleware';
import { withStockCache } from '@/lib/api/cache-middleware';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { YahooProvider } from '@/lib/api/providers/YahooProvider';

const checkRateLimit = rateLimit(100, 60000);

const finnhub = new FinnhubProvider();
const yahoo = new YahooProvider();

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
        console.log(`[Hybrid Fetch] Attempting Finnhub for ${symbol}`);
        let data = await finnhub.fetchData(symbol);

        if (data.length === 0) {
            console.warn(`[Hybrid Fetch] Finnhub returned no data for ${symbol}. Falling back to Yahoo.`);
            data = await yahoo.fetchData(symbol);
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error(`[Hybrid Fetch] Finnhub Failed for ${symbol}, trying Yahoo Fallback:`, error.message);

        try {
            const fallbackData = await yahoo.fetchData(symbol);
            return NextResponse.json(fallbackData);
        } catch (fallbackError: any) {
            console.error(`[Hybrid Fetch] Both providers failed for ${symbol}:`, fallbackError);
            return NextResponse.json({ error: 'All data providers failed' }, { status: 500 });
        }
    }
}

export const GET = withAuth(withStockCache(async (request: Request) => {
    const req = request as any;
    if (!checkRateLimit(req)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    return handler(request);
}));

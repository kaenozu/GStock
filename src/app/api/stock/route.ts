import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateSymbol, rateLimit } from '@/lib/api/middleware';
import { withStockCache } from '@/lib/api/cache-middleware';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { YahooProvider } from '@/lib/api/providers/YahooProvider';

const checkRateLimit = rateLimit(100, 60000);

const finnhub = new FinnhubProvider();
const yahoo = new YahooProvider();

// Finnhub APIキーが設定されているかチェック
const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'シンボルが必要です' }, { status: 400 });
    }

    if (!validateSymbol(symbol)) {
        return NextResponse.json({ error: '無効なシンボル形式です' }, { status: 400 });
    }

    // APIキーがなければ直接Yahooを使用
    if (!hasFinnhubKey) {
        try {
            const data = await yahoo.fetchData(symbol);
            if (data.length === 0) {
                return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
            }
            return NextResponse.json(data);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Yahoo] Failed for ${symbol}:`, msg);
            return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
        }
    }

    // Finnhub → Yahoo フォールバック
    try {
        let data = await finnhub.fetchData(symbol);

        if (data.length === 0) {
            console.warn(`[Hybrid Fetch] Finnhub returned no data for ${symbol}. Falling back to Yahoo.`);
            data = await yahoo.fetchData(symbol);
        }

        return NextResponse.json(data);

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Hybrid Fetch] Finnhub Failed for ${symbol}, trying Yahoo Fallback:`, msg);

        try {
            const fallbackData = await yahoo.fetchData(symbol);
            return NextResponse.json(fallbackData);
        } catch (fallbackError: unknown) {
            console.error(`[Hybrid Fetch] Both providers failed for ${symbol}:`, fallbackError);
            return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 });
        }
    }
}

export const GET = withAuth(withStockCache(async (request: NextRequest) => {
    // Apply rate limiting
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'レート制限を超えました' }, { status: 429 });
    }
    return handler(request);
}));

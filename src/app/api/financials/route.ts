import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const finnhub = new FinnhubProvider();
const checkRateLimit = rateLimit(30, 60000);

// Finnhub APIキーが設定されているかチェック
const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;

// デフォルトの財務データ（APIキーがない場合）
function getDefaultFinancials(symbol: string) {
    return {
        symbol,
        metricType: 'unavailable',
        message: 'APIキーが設定されていないため、財務データは利用できません',
        metric: {
            peRatio: null,
            eps: null,
            marketCap: null,
            revenue: null,
        }
    };
}

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'シンボルが必要です' }, { status: 400 });
    }

    // APIキーがない場合はデフォルトを返す
    if (!hasFinnhubKey) {
        return NextResponse.json(getDefaultFinancials(symbol));
    }

    try {
        const financials = await finnhub.fetchFinancials(symbol);
        return NextResponse.json(financials);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Financials Error] ${symbol}:`, msg);
        // エラー時もデフォルトを返す（500ではなく）
        return NextResponse.json(getDefaultFinancials(symbol));
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'レート制限を超えました' }, { status: 429 });
    }
    return handler(request);
});

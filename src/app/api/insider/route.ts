import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const finnhub = new FinnhubProvider();
const checkRateLimit = rateLimit(30, 60000);

// Finnhub APIキーが設定されているかチェック
const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;

// デフォルトのインサイダーデータ
function getDefaultInsiderData(symbol: string) {
    return {
        symbol,
        data: [],
        message: 'APIキーが設定されていないため、インサイダーデータは利用できません'
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
        return NextResponse.json(getDefaultInsiderData(symbol));
    }

    try {
        const insiderData = await finnhub.fetchInsiderSentiment(symbol);
        return NextResponse.json(insiderData);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Insider Error] ${symbol}:`, msg);
        return NextResponse.json(getDefaultInsiderData(symbol));
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'レート制限を超えました' }, { status: 429 });
    }
    return handler(request);
});

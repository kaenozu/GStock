import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateSymbol } from '@/lib/api/middleware';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';

const finnhub = new FinnhubProvider();

// Finnhub APIキーが設定されているかチェック
const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;

// デフォルトの決算データ
function getDefaultEarnings(symbol: string) {
    return {
        symbol,
        earnings: [],
        message: 'APIキーが設定されていないため、決算データは利用できません'
    };
}

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'シンボルが必要です' }, { status: 400 });
    }

    if (!validateSymbol(symbol)) {
        return NextResponse.json({ error: '無効なシンボル形式です' }, { status: 400 });
    }

    // APIキーがない場合はデフォルトを返す
    if (!hasFinnhubKey) {
        return NextResponse.json(getDefaultEarnings(symbol));
    }

    try {
        const earnings = await finnhub.fetchEarningsCalendar(symbol);
        return NextResponse.json(earnings);
    } catch (error: unknown) {
        console.error(`[Earnings API] Error for ${symbol}:`, error);
        // エラー時もデフォルトを返す
        return NextResponse.json(getDefaultEarnings(symbol));
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    return handler(request);
});

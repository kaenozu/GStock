import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateSymbol } from '@/lib/api/middleware';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';

const finnhub = new FinnhubProvider();

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

    // APIキーがなければ空配列を返す
    if (!hasFinnhubKey) {
        return NextResponse.json([]);
    }

    try {
        const earnings = await finnhub.fetchEarningsCalendar(symbol);
        return NextResponse.json(earnings);
    } catch (error: unknown) {
        console.error(`[Earnings API] Error for ${symbol}:`, error);
        // エラー時は空配列を返す（UIがクラッシュしないように）
        return NextResponse.json([]);
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    return handler(request);
});

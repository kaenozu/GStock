import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const finnhub = new FinnhubProvider();
const checkRateLimit = rateLimit(30, 60000); // 30 rpm shared pool

// Finnhub APIキーが設定されているかチェック
const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'シンボルが必要です' }, { status: 400 });
    }

    // APIキーがなければ空配列を返す
    if (!hasFinnhubKey) {
        return NextResponse.json([]);
    }

    try {
        const insiderData = await finnhub.fetchInsiderSentiment(symbol);
        return NextResponse.json(insiderData);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '不明なエラー';
        console.error(`[Insider Error] ${symbol}:`, msg);
        // エラー時は空配列を返す
        return NextResponse.json([]);
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    // APIキーがない場合はレート制限スキップ
    if (hasFinnhubKey && !checkRateLimit(request)) {
        return NextResponse.json({ error: 'レート制限を超えました。しばらくお待ちください。' }, { status: 429 });
    }
    return handler(request);
});

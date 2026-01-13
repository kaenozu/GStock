import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { withAuth, rateLimit } from '@/lib/api/middleware';

const finnhub = new FinnhubProvider();
const checkRateLimit = rateLimit(30, 60000); // 30 rpm for financials

// Finnhub APIキーが設定されているかチェック
const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;

// デフォルトの財務データ（APIキーがない場合）
function getDefaultFinancials(symbol: string) {
    return {
        symbol,
        pe: null,
        eps: null,
        epsGrowth: null,
        roe: null,
        revenueGrowth: null,
        marketCap: null,
        dividendYield: null,
        beta: null,
        _52wHigh: null,
        _52wLow: null,
        _note: 'APIキーが設定されていないため、財務データは利用できません'
    };
}

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'シンボルが必要です' }, { status: 400 });
    }

    // APIキーがなければデフォルトを返す
    if (!hasFinnhubKey) {
        return NextResponse.json(getDefaultFinancials(symbol));
    }

    try {
        const financials = await finnhub.fetchFinancials(symbol);
        return NextResponse.json(financials);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '不明なエラー';
        console.error(`[Financials Error] ${symbol}:`, msg);
        // エラー時もデフォルトを返す（クラッシュ防止）
        return NextResponse.json(getDefaultFinancials(symbol));
    }
}

export const GET = withAuth(async (request: NextRequest) => {
    // APIキーがない場合はレート制限スキップ
    if (hasFinnhubKey && !checkRateLimit(request)) {
        return NextResponse.json({ error: 'レート制限を超えました。しばらくお待ちください。' }, { status: 429 });
    }
    return handler(request);
});

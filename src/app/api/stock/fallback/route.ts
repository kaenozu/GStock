import { NextRequest, NextResponse } from 'next/server';
import { fetchStockData } from '@/lib/api/stock';

interface PollingState {
    [symbol: string]: {
        lastPrice: number;
        lastUpdate: number;
        subscribers: Set<string>;
    };
}

const pollingState: PollingState = {};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    try {
        const data = await fetchStockData(symbol);

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'No data found' }, { status: 404 });
        }

        const latest = data[data.length - 1];

        return NextResponse.json({
            symbol,
            price: latest.close,
            change: latest.close - data[data.length - 2]?.close || 0,
            changePercent: latest.close - data[data.length - 2]?.close
                ? ((latest.close - data[data.length - 2].close) / data[data.length - 2].close) * 100
                : 0,
            timestamp: latest.time,
            volume: latest.volume,
            isFallback: true
        });
    } catch (error) {
        console.error('[Fallback API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

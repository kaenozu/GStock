import { NextRequest, NextResponse } from 'next/server';
import { findOptimalStrategy } from '@/lib/api/backtest';
import { Historian } from '@/lib/backtest/Historian';

const historian = new Historian();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, period = '1y', marketRegime } = body;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        const data = await historian.getHistory(symbol, period as '1y' | '2y' | '5y');

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'No historical data found' }, { status: 404 });
        }

        const result = findOptimalStrategy(data, marketRegime);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Optimization API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to optimize strategy' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        return NextResponse.json({
            buyThreshold: 60,
            sellThreshold: 40,
            lastOptimized: null,
            marketRegime: null
        });
    } catch (error) {
        console.error('[Get Optimization Config] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get optimization config' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';

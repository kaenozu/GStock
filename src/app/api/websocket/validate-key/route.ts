import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { apiKey } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        const response = await fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=${apiKey}`
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Invalid API key or network error' },
                { status: 401 }
            );
        }

        const data = await response.json();

        if (!data.ticker) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        return NextResponse.json({ valid: true });
    } catch (error) {
        console.error('[Validate API Key] Error:', error);
        return NextResponse.json({ error: 'Failed to validate API key' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

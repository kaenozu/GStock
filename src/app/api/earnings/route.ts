import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { EarningsData, EarningsEvent } from '@/types/market';

// Mock data for development (when no API key)
function getMockEarnings(symbol: string): EarningsData {
    const today = new Date();
    const nextQuarter = new Date(today);
    nextQuarter.setMonth(nextQuarter.getMonth() + 2);
    
    const mockHistory: EarningsEvent[] = [];
    for (let i = 0; i < 8; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (i * 3));
        const q = Math.ceil((d.getMonth() + 1) / 3);
        mockHistory.push({
            date: d.toISOString().split('T')[0],
            epsEstimate: 1.20 + Math.random() * 0.5,
            epsActual: 1.25 + Math.random() * 0.5,
            revenueEstimate: 50000000000 + Math.random() * 10000000000,
            revenueActual: 52000000000 + Math.random() * 10000000000,
            surprise: (Math.random() - 0.3) * 20,
            period: `Q${q} ${d.getFullYear()}`,
        });
    }
    
    return {
        symbol,
        nextEarningsDate: nextQuarter.toISOString().split('T')[0],
        history: mockHistory,
    };
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }
    
    const apiKey = process.env.FINNHUB_API_KEY;
    
    // Use mock data if no API key
    if (!apiKey) {
        return NextResponse.json(getMockEarnings(symbol));
    }
    
    try {
        const provider = new FinnhubProvider();
        const data = await provider.fetchEarnings(symbol);
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('Earnings fetch error:', error);
        // Fallback to mock on error
        return NextResponse.json(getMockEarnings(symbol));
    }
}

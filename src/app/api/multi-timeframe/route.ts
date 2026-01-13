import { NextRequest, NextResponse } from 'next/server';
import { StockDataPoint } from '@/types/market';
import { fetchStockData } from '@/lib/api/alphavantage';

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const dailyData = await fetchStockData(symbol, 'daily', { outputsize: 'compact' });
    const hourly4hData = await fetchStockData(symbol, '4h', { outputsize: 'compact' });
    const hourly1hData = await fetchStockData(symbol, '1h', { outputsize: 'compact' });

    return NextResponse.json({
      symbol,
      timeframes: {
        daily: dailyData,
        '4h': hourly4hData,
        '1h': hourly1hData,
      },
    });
  } catch (error) {
    console.error('[Multi-Timeframe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch multi-timeframe data' },
      { status: 500 }
    );
  }
};

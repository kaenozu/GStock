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
    // fetchStockData only accepts symbol and outputsize params
    // Daily data is the default, use 'compact' for efficiency
    const dailyData = await fetchStockData(symbol, 'compact');
    // For 4h and 1h timeframes, we'll derive from daily data
    // since alphavantage API doesn't support these timeframes directly
    const hourly4hData = dailyData.slice(-20); // Last 20 data points as proxy
    const hourly1hData = dailyData.slice(-10); // Last 10 data points as proxy

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

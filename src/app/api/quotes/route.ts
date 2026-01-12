import { NextRequest, NextResponse } from 'next/server';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { YahooProvider } from '@/lib/api/providers/YahooProvider';

const finnhub = new FinnhubProvider();
const yahoo = new YahooProvider();

// In-memory cache for quotes (short TTL)
const quoteCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

async function fetchQuote(symbol: string): Promise<number> {
  // Skip CASH
  if (symbol === 'CASH') return 1;

  // Check cache
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    // Try Finnhub first
    const price = await finnhub.fetchQuote(symbol);
    if (price > 0) {
      quoteCache.set(symbol, { price, timestamp: Date.now() });
      return price;
    }
  } catch {
    console.warn(`[Quotes] Finnhub failed for ${symbol}, trying Yahoo`);
  }

  try {
    // Fallback to Yahoo
    const price = await yahoo.fetchQuote(symbol);
    quoteCache.set(symbol, { price, timestamp: Date.now() });
    return price;
  } catch {
    console.error(`[Quotes] Both providers failed for ${symbol}`);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });
  }

  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
  
  if (symbols.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 symbols allowed' }, { status: 400 });
  }

  const results: Record<string, number> = {};

  // Fetch prices in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const prices = await Promise.all(batch.map(fetchQuote));
    batch.forEach((symbol, idx) => {
      results[symbol] = prices[idx];
    });
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return NextResponse.json({
    quotes: results,
    timestamp: new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, rateLimit, validateScanRequest } from '@/lib/api/middleware';
import { FinnhubProvider } from '@/lib/api/providers/FinnhubProvider';
import { YahooProvider } from '@/lib/api/providers/YahooProvider';
import { StockProvider } from '@/lib/api/providers/StockProvider';
import { calculateAdvancedPredictions } from '@/lib/api/prediction-engine';
import { AnalysisResult } from '@/types/market';

const checkRateLimit = rateLimit(20, 60000);

interface ScanRequest {
    symbols: string[];
    period?: string;
}

interface ScanResult {
    symbol: string;
    status: 'success' | 'error';
    data?: AnalysisResult;
    error?: string;
}

interface ScanResponse {
    total: number;
    successful: number;
    failed: number;
    results: ScanResult[];
}

const finnhub = new FinnhubProvider();
const yahoo = new YahooProvider();

const providers: StockProvider[] = [finnhub, yahoo];

async function fetchStockData(symbol: string): Promise<AnalysisResult> {
    for (const provider of providers) {
        try {
            const data = await provider.fetchData(symbol);
            if (data.length > 0) {
                const analysis = calculateAdvancedPredictions(data);
                return {
                    ...analysis,
                    symbol,
                    history: data,
                    isRealtime: true
                };
            }
        } catch (error) {
            console.error(`Provider ${provider.name} failed for ${symbol}:`, error);
            continue;
        }
    }
    throw new Error(`All providers failed for ${symbol}`);
}

async function handler(request: Request) {
    try {
        const body = await request.json() as ScanRequest;

        const validation = validateScanRequest(body);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.errors }, { status: 400 });
        }

        const { symbols, period } = body;

        const results: ScanResult[] = await Promise.all(
            symbols.map(async (symbol) => {
                try {
                    const data = await fetchStockData(symbol);
                    return {
                        symbol,
                        status: 'success' as const,
                        data
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    return {
                        symbol,
                        status: 'error' as const,
                        error: errorMessage
                    };
                }
            })
        );

        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;

        const response: ScanResponse = {
            total: symbols.length,
            successful,
            failed,
            results
        };

        return NextResponse.json(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export const POST = withAuth(async (request: NextRequest) => {
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    return handler(request);
});

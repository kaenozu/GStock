/**
 * Predictions API - Server-side prediction storage
 * GET: Fetch predictions (all, pending, or by symbol)
 * POST: Log a new prediction
 * PUT: Evaluate a prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import { PredictionStore } from '@/lib/db';
import { MarketRegime } from '@/types/market';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const symbol = searchParams.get('symbol');
    
    try {
        if (type === 'pending') {
            const predictions = PredictionStore.getPending();
            return NextResponse.json({ predictions });
        }
        
        if (symbol) {
            const predictions = PredictionStore.getBySymbol(symbol);
            return NextResponse.json({ predictions });
        }
        
        const predictions = PredictionStore.getAll();
        return NextResponse.json({ predictions });
    } catch (error) {
        console.error('[Predictions API] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch predictions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, predictedDirection, confidence, priceAtPrediction, regime, autoLog } = body;
        
        if (!symbol || !predictedDirection || confidence === undefined || priceAtPrediction === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: symbol, predictedDirection, confidence, priceAtPrediction' },
                { status: 400 }
            );
        }
        
        // Auto-log mode: skip if already logged today
        if (autoLog) {
            const logged = PredictionStore.autoLog({
                symbol,
                predictedDirection,
                confidence,
                priceAtPrediction,
                regime: regime as MarketRegime,
            });
            
            return NextResponse.json({ logged, skipped: !logged });
        }
        
        // Manual log
        const prediction = PredictionStore.log({
            symbol,
            predictedDirection,
            confidence,
            priceAtPrediction,
            regime: regime as MarketRegime,
        });
        
        return NextResponse.json({ prediction });
    } catch (error) {
        console.error('[Predictions API] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to log prediction' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, actualPrice } = body;
        
        if (!id || actualPrice === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: id, actualPrice' },
                { status: 400 }
            );
        }
        
        const prediction = PredictionStore.evaluate(id, actualPrice);
        
        if (!prediction) {
            return NextResponse.json(
                { error: 'Prediction not found' },
                { status: 404 }
            );
        }
        
        return NextResponse.json({ prediction });
    } catch (error) {
        console.error('[Predictions API] PUT error:', error);
        return NextResponse.json(
            { error: 'Failed to evaluate prediction' },
            { status: 500 }
        );
    }
}

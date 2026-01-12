import { NextRequest, NextResponse } from 'next/server';
import { PaperTradingEngine } from '@/lib/trading/PaperTrader';
import { TradeRequest } from '@/lib/trading/types';
import { withAuth, validateTradeRequest, rateLimit } from '@/lib/api/middleware';
import { withPortfolioCache } from '@/lib/api/cache-middleware';
import { InternalPaperBroker } from '@/lib/trading/providers/InternalBroker';
import { AlpacaBroker } from '@/lib/trading/providers/AlpacaBroker';

const engine = new PaperTradingEngine();
const internalBroker = new InternalPaperBroker(engine);
const alpacaBroker = new AlpacaBroker();

const checkRateLimit = rateLimit(50, 60000);

function getBroker(request: Request) {
    const mode = request.headers.get('x-execution-mode');
    return mode === 'LIVE' ? alpacaBroker : internalBroker;
}

export const GET = withAuth(withPortfolioCache(async (request: NextRequest) => { // Use NextRequest
    try {
        const broker = getBroker(request);
        const portfolio = await broker.getPortfolio();
        return NextResponse.json(portfolio);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}));

export const POST = withAuth(withPortfolioCache(async (request: NextRequest) => {
    if (!checkRateLimit(request)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const tradeRequest: TradeRequest = body;
        const broker = getBroker(request);

        const validation = validateTradeRequest(tradeRequest);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.errors?.join(', ') }, { status: 400 });
        }

        const trade = await broker.executeTrade(
            tradeRequest.symbol,
            tradeRequest.side,
            tradeRequest.quantity || 1,
            tradeRequest.price,
            tradeRequest.orderType || 'MARKET',
            tradeRequest.reason || 'Council Consensus'
        );

        return NextResponse.json({ success: true, message: "Order Executed", trade });

    } catch (error: unknown) {
        console.error("[Broker Error]:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}));

import { NextRequest, NextResponse } from 'next/server';

// Simple API key authentication middleware
export function withAuth(handler: (req: NextRequest, context?: any) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: any) => {
        // Skip auth for development if needed
        if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
            return handler(req, context);
        }

        const authHeader = req.headers.get('authorization');
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            console.warn('API_KEY environment variable not set');
            // In production, this should fail
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
            }
        }

        // Check for Bearer token or API key in header
        const providedKey = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('api_key');

        if (!providedKey || providedKey !== apiKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return handler(req, context);
    };
}

// Input validation utilities
export function validateSymbol(symbol: string): boolean {
    // Basic symbol validation: 1-5 letters, optionally with .extension
    return /^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(symbol.toUpperCase());
}

export function validateTradeRequest(data: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!data.symbol || typeof data.symbol !== 'string') {
        errors.push('Symbol is required and must be a string');
    } else if (!validateSymbol(data.symbol)) {
        errors.push('Invalid symbol format');
    }

    if (!data.side || !['BUY', 'SELL'].includes(data.side)) {
        errors.push('Side must be either BUY or SELL');
    }

    if (!data.quantity || typeof data.quantity !== 'number' || data.quantity <= 0) {
        errors.push('Quantity must be a positive number');
    }

    if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
        errors.push('Price must be a positive number');
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

// Rate limiting (in-memory, not production-ready)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
    return (req: NextRequest) => {
        const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const now = Date.now();
        const clientData = rateLimitMap.get(clientId);

        if (!clientData || now > clientData.resetTime) {
            rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (clientData.count >= maxRequests) {
            return false;
        }

        clientData.count++;
        return true;
    };
}
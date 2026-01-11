import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication Mode:
 * - GSTOCK_AUTH_MODE=none: No authentication (for personal/self-hosted use)
 * - GSTOCK_AUTH_MODE=api_key: Require API_KEY (for public deployment)
 * - Default: 'none' for development, 'api_key' for production
 */
type AuthMode = 'none' | 'api_key';

function getAuthMode(): AuthMode {
    const explicitMode = process.env.GSTOCK_AUTH_MODE as AuthMode;
    if (explicitMode === 'none' || explicitMode === 'api_key') {
        return explicitMode;
    }
    // Legacy support: SKIP_AUTH=true means 'none'
    if (process.env.SKIP_AUTH === 'true') {
        return 'none';
    }
    // Default: development=none, production=api_key
    return process.env.NODE_ENV === 'production' ? 'api_key' : 'none';
}

// Simple API key authentication middleware
export function withAuth(handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: unknown) => {
        const authMode = getAuthMode();
        
        // No authentication required
        if (authMode === 'none') {
            return handler(req, context);
        }

        // API Key authentication
        const authHeader = req.headers.get('authorization');
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            console.error('[Auth] API_KEY not set but auth mode is api_key');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Check for Bearer token or API key in header/query
        const providedKey = authHeader?.replace('Bearer ', '') || req.nextUrl.searchParams.get('api_key');

        if (!providedKey || providedKey !== apiKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return handler(req, context);
    };
}

// Input validation utilities
export function validateSymbol(symbol: string): boolean {
    // Symbol validation: 1-6 alphanumeric chars, optionally with .extension (e.g., AAPL, 7203.T)
    return /^[A-Z0-9]{1,6}(\.[A-Z]{1,3})?$/i.test(symbol);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
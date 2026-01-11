import { NextRequest, NextResponse } from 'next/server';

type HandlerContext = Record<string, unknown> | undefined;

// Simple API key authentication middleware
export function withAuth(handler: (req: NextRequest, context?: HandlerContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: HandlerContext) => {
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

// CORS middleware for Next.js API routes
export function withCors(handler: (req: NextRequest, context?: HandlerContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: HandlerContext) => {
        const origin = req.headers.get('origin');
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

        if (origin && allowedOrigins.includes(origin)) {
            const response = await handler(req, context);
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return response;
        }

        if (req.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204 });
        }

        return handler(req, context);
    };
}

// Security headers middleware
export function withSecurityHeaders(handler: (req: NextRequest, context?: HandlerContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: HandlerContext) => {
        const response = await handler(req, context);

        // Security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

        if (process.env.NODE_ENV === 'production') {
            response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return response;
    };
}

// Request logging middleware
export function withLogging(handler: (req: NextRequest, context?: HandlerContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context?: HandlerContext) => {
        const startTime = Date.now();
        const method = req.method;
        const url = req.url;
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

        try {
            const response = await handler(req, context);
            const duration = Date.now() - startTime;

            console.log(`[${method}] ${url} - ${response.status} - ${duration}ms - ${ip}`);
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[${method}] ${url} - ERROR - ${duration}ms - ${ip}: ${errorMsg}`);
            throw error;
        }
    };
}

interface TradeRequest {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
}

interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

// Input validation utilities
export function validateSymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== 'string') {
        return false;
    }
    
    const trimmed = symbol.trim().toUpperCase();
    if (trimmed.length === 0 || trimmed.length > 10) {
        return false;
    }

    // Basic symbol validation: 1-5 letters, optionally with .extension
    // Also allow for numeric characters in some cases
    return /^[A-Z0-9]{1,5}(\.[A-Z]{1,3})?$/.test(trimmed);
}

// Sanitize user input to prevent XSS and injection attacks
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }
    
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove inline event handlers
}

// Validate period parameter
export function validatePeriod(period: string): boolean {
    const validPeriods = ['1d', '1w', '1m', '3m', '6m', '1y', '2y', '5y', 'max'];
    return validPeriods.includes(period);
}

// Validate and sanitize trade request
export function validateTradeRequest(data: unknown): ValidationResult {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid request body'] };
    }
    
    const tradeData = data as Record<string, unknown>;

    if (!tradeData.symbol || typeof tradeData.symbol !== 'string') {
        errors.push('Symbol is required and must be a string');
    } else if (!validateSymbol(tradeData.symbol)) {
        errors.push('Invalid symbol format');
    }

    if (!tradeData.side || typeof tradeData.side !== 'string') {
        errors.push('Side must be either BUY or SELL');
    } else if (!['BUY', 'SELL'].includes(tradeData.side)) {
        errors.push('Side must be either BUY or SELL');
    }

    if (typeof tradeData.quantity !== 'number' || tradeData.quantity <= 0) {
        errors.push('Quantity must be a positive number');
    }

    if (typeof tradeData.price !== 'number' || tradeData.price <= 0) {
        errors.push('Price must be a positive number');
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}

// Validate scan request parameters
export function validateScanRequest(data: unknown): ValidationResult {
    const errors: string[] = [];
    
    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Invalid request body'] };
    }
    
    const scanData = data as Record<string, unknown>;

    if (!scanData.symbols || !Array.isArray(scanData.symbols)) {
        errors.push('Symbols must be an array');
    } else if (scanData.symbols.length === 0) {
        errors.push('Symbols array cannot be empty');
    } else if (scanData.symbols.length > 100) {
        errors.push('Cannot scan more than 100 symbols at once');
    } else {
        const invalidSymbols = scanData.symbols.filter(
            (s) => typeof s !== 'string' || !validateSymbol(s)
        );
        if (invalidSymbols.length > 0) {
            errors.push(`Invalid symbols: ${invalidSymbols.join(', ')}`);
        }
    }

    if (scanData.period && typeof scanData.period === 'string' && !validatePeriod(scanData.period)) {
        errors.push('Invalid period. Valid values: 1d, 1w, 1m, 3m, 6m, 1y, 2y, 5y, max');
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
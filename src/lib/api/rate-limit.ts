import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
};

export async function checkRateLimit(identifier: string, config: RateLimitConfig = RATE_LIMIT_CONFIG): Promise<boolean> {
    const now = Date.now();
    const store = rateLimitStore.get(identifier);

    if (!store || now > store.resetTime) {
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return true;
    }

    if (store.count >= config.maxRequests) {
        return false;
    }

    rateLimitStore.set(identifier, {
        count: store.count + 1,
        resetTime: store.resetTime,
    });

    return true;
}

export function getRateLimitHeaders(identifier: string, config: RateLimitConfig = RATE_LIMIT_CONFIG): Headers {
    const store = rateLimitStore.get(identifier);
    const headers = new Headers();

    if (!store) {
        headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        headers.set('X-RateLimit-Remaining', (config.maxRequests - 1).toString());
        headers.set('X-RateLimit-Reset', ((Date.now() + config.windowMs) / 1000).toString());
        return headers;
    }

    const remaining = Math.max(0, config.maxRequests - store.count);
    const resetTime = Math.max(Date.now(), store.resetTime);

    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', (resetTime / 1000).toString());

    return headers;
}

export function withRateLimit(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest) => {
        const identifier = getClientIdentifier(request);

        const isAllowed = await checkRateLimit(identifier);

        if (!isAllowed) {
            const headers = getRateLimitHeaders(identifier);
            return NextResponse.json(
                {
                    error: 'Too many requests',
                    message: 'レート制限を超えました。しばらくお待ちください。',
                },
                {
                    status: 429,
                    headers,
                }
            );
        }

        const response = await handler(request);

        if (response.headers) {
            const rateLimitHeaders = getRateLimitHeaders(identifier);
            rateLimitHeaders.forEach((value, key) => {
                response.headers.set(key, value);
            });
        }

        return response;
    };
}

function getClientIdentifier(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    const hash = Buffer.from(`${ip}:${userAgent}`).toString('base64');
    return hash.slice(0, 32);
}
import { NextRequest, NextResponse } from 'next/server';
import { indexedDBCache } from '@/lib/cache/IndexedDBCache';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Store token in IndexedDB
        await indexedDBCache.init();
        const tokensData = await indexedDBCache.get('push-tokens', 'all') || { tokens: [] };

        if (!tokensData.tokens.includes(token)) {
            tokensData.tokens.push(token);
            await indexedDBCache.set('push-tokens', 'all', tokensData);
        }

        return NextResponse.json({ success: true, token });
    } catch (error) {
        console.error('[Push API] Register error:', error);
        return NextResponse.json(
            { error: 'Failed to register token' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Remove token from IndexedDB
        await indexedDBCache.init();
        const tokensData = await indexedDBCache.get('push-tokens', 'all') || { tokens: [] };
        const filteredTokens = tokensData.tokens.filter((t: string) => t !== token);
        await indexedDBCache.set('push-tokens', 'all', { tokens: filteredTokens });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Push API] Unregister error:', error);
        return NextResponse.json(
            { error: 'Failed to unregister token' },
            { status: 500 }
        );
    }
}
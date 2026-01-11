import { NextRequest, NextResponse } from 'next/server';
import { messaging } from '@/lib/firebase/admin';
import { indexedDBCache } from '@/lib/cache/IndexedDBCache';

interface PushNotificationPayload {
    title: string;
    body: string;
    tag?: string;
    requireInteraction?: boolean;
    actions?: Array<{
        action: string;
        title: string;
    }>;
}

export async function POST(request: NextRequest) {
    try {
        const payload: PushNotificationPayload = await request.json();

        if (!payload.title || !payload.body) {
            return NextResponse.json(
                { error: 'Title and body are required' },
                { status: 400 }
            );
        }

        // Get all registered push tokens from IndexedDB
        await indexedDBCache.init();
        const tokensData = await indexedDBCache.get('push-tokens', 'all') || [];

        if (!tokensData.tokens || tokensData.tokens.length === 0) {
            return NextResponse.json(
                { message: 'No registered devices' },
                { status: 200 }
            );
        }

        const tokens = tokensData.tokens;

        // Create notification messages
        const messages = tokens.map((token: string) => ({
            notification: {
                title: payload.title,
                body: payload.body,
                tag: payload.tag,
                requireInteraction: payload.requireInteraction || false,
            },
            token: token,
            android: {
                priority: 'high',
            },
            apns: {
                payload: {
                    aps: {
                        'content-available': 1,
                    },
                },
            },
        }));

        // Send push notifications using Firebase Admin SDK
        const response = await messaging.sendEachForMulticast(messages);

        // Store failed tokens for cleanup
        const failedTokens: string[] = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });

            // Remove failed tokens from IndexedDB
            for (const token of failedTokens) {
                await indexedDBCache.delete('push-tokens', token);
            }

            console.error('[Push API] Failed tokens:', failedTokens);
        }

        return NextResponse.json({
            success: true,
            recipients: response.successCount,
            failed: response.failureCount,
            removedTokens: failedTokens.length,
        });
    } catch (error) {
        console.error('[Push API] Send error:', error);
        return NextResponse.json(
            { error: 'Failed to send push notification' },
            { status: 500 }
        );
    }
}
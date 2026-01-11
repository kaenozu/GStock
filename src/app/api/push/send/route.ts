import { NextRequest, NextResponse } from 'next/server';

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

        // Get all registered push tokens
        const tokens = JSON.parse(localStorage.getItem('pushTokens') || '[]');

        if (tokens.length === 0) {
            return NextResponse.json(
                { message: 'No registered devices' },
                { status: 200 }
            );
        }

        // In production, use Firebase Admin SDK to send notifications
        // For now, we'll store notifications in localStorage for testing
        const notifications = JSON.parse(localStorage.getItem('pendingNotifications') || '[]');
        notifications.push({
            ...payload,
            timestamp: Date.now(),
            id: Date.now().toString()
        });
        localStorage.setItem('pendingNotifications', JSON.stringify(notifications));

        // TODO: Integrate Firebase Admin SDK for actual push notifications
        // const admin = require('firebase-admin');
        // const message = {
        //     notification: {
        //         title: payload.title,
        //         body: payload.body,
        //     },
        //     tokens: tokens,
        // };
        // await admin.messaging().sendMulticast(message);

        return NextResponse.json({
            success: true,
            recipients: tokens.length
        });
    } catch (error) {
        console.error('[Push API] Send error:', error);
        return NextResponse.json(
            { error: 'Failed to send push notification' },
            { status: 500 }
        );
    }
}
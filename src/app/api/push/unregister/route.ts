import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Remove token (in production, remove from database)
        const tokens = JSON.parse(localStorage.getItem('pushTokens') || '[]');
        const filteredTokens = tokens.filter((t: string) => t !== token);
        localStorage.setItem('pushTokens', JSON.stringify(filteredTokens));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Push API] Unregister error:', error);
        return NextResponse.json(
            { error: 'Failed to unregister token' },
            { status: 500 }
        );
    }
}
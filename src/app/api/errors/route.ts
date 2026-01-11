/**
 * Errors API - Server-side error log access
 * GET: Fetch error logs
 * POST: Log a client-side error
 */

import { NextRequest, NextResponse } from 'next/server';
import { ErrorStore } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level') as 'ERROR' | 'WARN' | 'INFO' | null;
    const limit = parseInt(searchParams.get('limit') || '100');
    const summary = searchParams.get('summary') === 'true';
    
    try {
        if (summary) {
            const counts = ErrorStore.getCountByLevel(24);
            return NextResponse.json({ counts });
        }
        
        if (level) {
            const errors = ErrorStore.getByLevel(level, limit);
            return NextResponse.json({ errors });
        }
        
        const errors = ErrorStore.getRecent(limit);
        return NextResponse.json({ errors });
    } catch (error) {
        console.error('[Errors API] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch error logs' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { level, message, context, stack } = body;
        
        if (!level || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: level, message' },
                { status: 400 }
            );
        }
        
        const entry = ErrorStore.log({
            level,
            message,
            context,
            stack,
        });
        
        return NextResponse.json({ entry });
    } catch (error) {
        console.error('[Errors API] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to log error' },
            { status: 500 }
        );
    }
}

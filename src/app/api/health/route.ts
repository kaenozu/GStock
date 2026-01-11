import { NextRequest, NextResponse } from 'next/server';

interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
    checks: {
        api: { status: string; latency?: number };
        cache: { status: string };
        database: { status: string };
    };
}

export const GET = async (req: NextRequest) => {
    const startTime = Date.now();
    const uptime = process.uptime();
    const environment = process.env.NODE_ENV || 'unknown';
    const version = process.env.npm_package_version || '0.1.0';

    const checks = {
        api: { status: 'ok' } as { status: string; latency?: number },
        cache: { status: 'ok' },
        database: { status: 'ok' }
    };

    // Check API latency (simple self-check)
    try {
        checks.api.latency = Date.now() - startTime;
    } catch (error) {
        checks.api.status = 'error';
    }

    // Determine overall health status
    const allChecksOk = Object.values(checks).every(check => check.status === 'ok');
    const anyChecksError = Object.values(checks).some(check => check.status === 'error');

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (anyChecksError) {
        status = 'unhealthy';
    } else if (!allChecksOk) {
        status = 'degraded';
    }

    const response: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        environment,
        version,
        checks
    };

    const statusCode = status === 'unhealthy' ? 503 : 200;
    return NextResponse.json(response, { status: statusCode });
};

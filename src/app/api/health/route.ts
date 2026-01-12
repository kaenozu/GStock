/**
 * Health Check Endpoint
 * @description サービスの正常性を確認するエンドポイント
 */

import { NextResponse } from 'next/server';
import fsSync from 'fs';
import path from 'path';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    checks: {
        database: boolean;
        dataDirectory: boolean;
        memory: {
            used: number;
            total: number;
            percentUsed: number;
        };
    };
    uptime: number;
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthStatus>> {
    const dataDir = process.env.GSTOCK_DATA_DIR || path.join(process.cwd(), 'data');
    
    // データディレクトリの確認
    let dataDirOk = false;
    try {
        dataDirOk = fsSync.existsSync(dataDir);
        if (!dataDirOk) {
            fsSync.mkdirSync(dataDir, { recursive: true });
            dataDirOk = true;
        }
    } catch {
        dataDirOk = false;
    }

    // メモリ使用量
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // ステータス判定
    let status: HealthStatus['status'] = 'healthy';
    if (!dataDirOk) {
        status = 'degraded';
    }
    if (memoryPercent > 90) {
        status = 'degraded';
    }

    const healthStatus: HealthStatus = {
        status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
            database: true, // 将来のDB接続チェック用
            dataDirectory: dataDirOk,
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                percentUsed: Math.round(memoryPercent),
            },
        },
        uptime: Math.round((Date.now() - startTime) / 1000),
    };

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });
}

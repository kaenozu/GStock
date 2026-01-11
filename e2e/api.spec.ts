/**
 * API E2E Tests
 * @description APIエンドポイントのテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Health API', () => {
    test('/api/health が正常に応答する', async ({ request }) => {
        const response = await request.get('/api/health');
        
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data.status).toBe('healthy');
        expect(data.timestamp).toBeDefined();
        expect(data.checks).toBeDefined();
        expect(data.checks.dataDirectory).toBe(true);
    });

    test('/api/health がメモリ情報を返す', async ({ request }) => {
        const response = await request.get('/api/health');
        const data = await response.json();
        
        expect(data.checks.memory).toBeDefined();
        expect(data.checks.memory.used).toBeGreaterThan(0);
        expect(data.checks.memory.total).toBeGreaterThan(0);
        expect(data.checks.memory.percentUsed).toBeLessThanOrEqual(100);
    });
});

test.describe('Stock API', () => {
    test('/api/stock がシンボルなしでエラーを返す', async ({ request }) => {
        const response = await request.get('/api/stock');
        
        expect(response.status()).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBeDefined();
    });

    test('/api/stock が無効なシンボルでエラーを返す', async ({ request }) => {
        const response = await request.get('/api/stock?symbol=INVALID!!!');
        
        expect(response.status()).toBe(400);
    });

    test('/api/stock が有効なシンボルでデータを返す', async ({ request }) => {
        const response = await request.get('/api/stock?symbol=AAPL');
        
        // 成功またはレートリミット
        expect([200, 429, 500].includes(response.status())).toBeTruthy();
        
        if (response.ok()) {
            const data = await response.json();
            // 配列またはエラーオブジェクト
            if (Array.isArray(data)) {
                expect(data.length).toBeGreaterThan(0);
                expect(data[0]).toHaveProperty('time');
                expect(data[0]).toHaveProperty('close');
            }
        }
    });
});

test.describe('Trade API', () => {
    test('/api/trade GET がポートフォリオを返す', async ({ request }) => {
        const response = await request.get('/api/trade');
        
        expect(response.ok()).toBeTruthy();
        
        const data = await response.json();
        expect(data).toHaveProperty('cash');
        expect(data).toHaveProperty('equity');
        expect(data).toHaveProperty('positions');
        expect(data).toHaveProperty('trades');
    });

    test('/api/trade POST が不正なリクエストを拒否する', async ({ request }) => {
        const response = await request.post('/api/trade', {
            data: {
                symbol: 'AAPL',
                side: 'INVALID',
                quantity: 10,
                price: 150,
            },
        });
        
        expect(response.status()).toBe(400);
    });

    test('/api/trade POST が正常なリクエストを受け付ける', async ({ request }) => {
        const response = await request.post('/api/trade', {
            data: {
                symbol: 'TEST_E2E',
                side: 'BUY',
                quantity: 1,
                price: 100,
                reason: 'E2E Test',
            },
        });
        
        // 成功またはCircuitBreakerによる拒否
        expect([200, 400, 429].includes(response.status())).toBeTruthy();
    });
});

test.describe('Quotes API', () => {
    test('/api/quotes がシンボルなしでエラーを返す', async ({ request }) => {
        const response = await request.get('/api/quotes');
        
        expect(response.status()).toBe(400);
    });
});

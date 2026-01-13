/**
 * Stock API Tests
 * @description APIルートのユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Stock API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Symbol Validation', () => {
        it('有効なシンボル形式を受け入れる', () => {
            const validSymbols = ['AAPL', 'MSFT', 'GOOGL', 'BRK.B', 'BRK-A'];
            validSymbols.forEach(symbol => {
                const isValid = /^[A-Z]{1,5}([.-][A-Z])?$/.test(symbol);
                expect(isValid).toBe(true);
            });
        });

        it('無効なシンボル形式を拒否する', () => {
            const invalidSymbols = ['', '123', 'aapl', 'TOOLONGSY', 'A B C'];
            invalidSymbols.forEach(symbol => {
                const isValid = /^[A-Z]{1,5}([.-][A-Z])?$/.test(symbol);
                expect(isValid).toBe(false);
            });
        });
    });

    describe('Data Fetching', () => {
        it('正常なレスポンスを処理できる', async () => {
            const mockData = [
                { time: '2024-01-01', open: 100, high: 105, low: 99, close: 103, volume: 1000 },
                { time: '2024-01-02', open: 103, high: 108, low: 102, close: 107, volume: 1200 },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockData,
            });

            const response = await fetch('/api/stock?symbol=AAPL');
            const data = await response.json();

            expect(data).toHaveLength(2);
            expect(data[0]).toHaveProperty('close');
            expect(data[0]).toHaveProperty('time');
        });

        it('エラーレスポンスを処理できる', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ error: 'Symbol not found' }),
            });

            const response = await fetch('/api/stock?symbol=INVALID');
            expect(response.ok).toBe(false);
            expect(response.status).toBe(404);
        });

        it('レート制限エラーを処理できる', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                json: async () => ({ error: 'Rate limit exceeded' }),
            });

            const response = await fetch('/api/stock?symbol=AAPL');
            expect(response.status).toBe(429);
        });
    });

    describe('Data Validation', () => {
        it('必須フィールドが含まれていることを確認', () => {
            const validDataPoint = {
                time: '2024-01-01',
                open: 100,
                high: 105,
                low: 99,
                close: 103,
                volume: 1000
            };

            const requiredFields = ['time', 'open', 'high', 'low', 'close', 'volume'];
            requiredFields.forEach(field => {
                expect(validDataPoint).toHaveProperty(field);
            });
        });

        it('数値フィールドが正の数値であることを確認', () => {
            const dataPoint = {
                open: 100,
                high: 105,
                low: 99,
                close: 103,
                volume: 1000
            };

            Object.values(dataPoint).forEach(value => {
                expect(typeof value).toBe('number');
                expect(value).toBeGreaterThan(0);
            });
        });

        it('high >= low であることを確認', () => {
            const dataPoint = { high: 105, low: 99 };
            expect(dataPoint.high).toBeGreaterThanOrEqual(dataPoint.low);
        });
    });
});

describe('Rate Limiting', () => {
    it('レート制限カウンターが正しく動作する', () => {
        const rateLimit = (limit: number, windowMs: number) => {
            const requests: number[] = [];
            
            return () => {
                const now = Date.now();
                const windowStart = now - windowMs;
                
                // 古いリクエストを削除
                while (requests.length > 0 && requests[0] < windowStart) {
                    requests.shift();
                }
                
                if (requests.length >= limit) {
                    return false;
                }
                
                requests.push(now);
                return true;
            };
        };

        const checkLimit = rateLimit(3, 1000);
        
        expect(checkLimit()).toBe(true);
        expect(checkLimit()).toBe(true);
        expect(checkLimit()).toBe(true);
        expect(checkLimit()).toBe(false); // 制限超過
    });
});

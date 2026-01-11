import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withCache, withStockCache, withPortfolioCache, resetCache } from '../src/lib/api/cache-middleware';
import { NextRequest } from 'next/server';

describe('Cache Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCache();
  });

  describe('Basic Cache Functionality', () => {
    it('should cache GET requests and return HIT on subsequent calls', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ data: 'test' }), { status: 200 }))
      );
      
      const cachedHandler = withCache(handler, { ttl: 1000 });
      
      const req = new NextRequest('http://localhost:3000/api/test');
      
      const response1 = await cachedHandler(req);
      const data1 = await response1.json();
      expect(response1.headers.get('X-Cache')).toBe('MISS');
      expect(handler).toHaveBeenCalledTimes(1);
      
      const response2 = await cachedHandler(req);
      const data2 = await response2.json();
      expect(response2.headers.get('X-Cache')).toBe('HIT');
      expect(data2).toEqual(data1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not cache non-GET requests', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ data: 'test' }), { status: 200 }))
      );
      
      const cachedHandler = withCache(handler, { ttl: 1000 });
      
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      });
      
      const response = await cachedHandler(req);
      expect(response.headers.get('X-Cache')).toBeNull();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should expire cache entries after TTL', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ data: 'test' }), { status: 200 }))
      );

      const cachedHandler = withCache(handler, { ttl: 100 });

      const req = new NextRequest('http://localhost:3000/api/test');

      await cachedHandler(req);
      expect(handler).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 150));

      await cachedHandler(req);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should use custom cache key generator', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ data: 'test' }), { status: 200 }))
      );
      
      const customKeyGen = (req: NextRequest) => `custom:${req.url}`;
      const cachedHandler = withCache(handler, {
        ttl: 1000,
        keyGenerator: customKeyGen
      });
      
      const req = new NextRequest('http://localhost:3000/api/test');
      const response = await cachedHandler(req);
      
      expect(response.headers.get('X-Cache')).toBe('MISS');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stock Cache', () => {
    it('should cache stock data with symbol key', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ price: 100 }), { status: 200 }))
      );
      
      const cachedHandler = withStockCache(handler, 1000);
      
      const req = new NextRequest('http://localhost:3000/api/stock?symbol=AAPL');
      
      await cachedHandler(req);
      expect(handler).toHaveBeenCalledTimes(1);
      
      const response2 = await cachedHandler(req);
      expect(response2.headers.get('X-Cache')).toBe('HIT');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should use different cache keys for different symbols', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ price: 100 }), { status: 200 }))
      );
      
      const cachedHandler = withStockCache(handler, 1000);
      
      const req1 = new NextRequest('http://localhost:3000/api/stock?symbol=AAPL');
      const req2 = new NextRequest('http://localhost:3000/api/stock?symbol=GOOGL');
      
      await cachedHandler(req1);
      await cachedHandler(req2);
      
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Portfolio Cache', () => {
    it('should cache portfolio data with single key', async () => {
      const handler = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ total: 10000 }), { status: 200 }))
      );
      
      const cachedHandler = withPortfolioCache(handler, 1000);
      
      const req1 = new NextRequest('http://localhost:3000/api/portfolio');
      const req2 = new NextRequest('http://localhost:3000/api/portfolio');
      
      await cachedHandler(req1);
      await cachedHandler(req2);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Performance', () => {
    it('should improve response time for cached requests', async () => {
      const slowHandler = vi.fn().mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(new Response(JSON.stringify({ data: 'slow' }), { status: 200 }));
          }, 100);
        })
      );
      
      const cachedHandler = withCache(slowHandler, { ttl: 5000 });
      
      const req = new NextRequest('http://localhost:3000/api/slow');
      
      const start1 = Date.now();
      await cachedHandler(req);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await cachedHandler(req);
      const time2 = Date.now() - start2;
      
      expect(time1).toBeGreaterThan(90);
      expect(time2).toBeLessThan(10);
    });
  });
});

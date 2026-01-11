import { NextRequest, NextResponse } from 'next/server';

// インメモリキャッシュ（プロダクションではRedisなどを推奨）
class APICache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  
  set(key: string, data: unknown, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // クリーンアップ（100アイテム超過時）
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }
  
  get(key: string): unknown {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  getEntry(key: string): { data: unknown; timestamp: number; ttl: number } | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  reset(): void {
    this.clear();
  }
  
  private cleanup(): void {
    const entries = Array.from(this.cache.entries());
    // 古い30%を削除
    entries
      .sort(([,a], [,b]) => a.timestamp - b.timestamp)
      .slice(0, Math.floor(entries.length * 0.3))
      .forEach(([key]) => this.cache.delete(key));
  }
  
  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length
    };
  }
}

const apiCache = new APICache();

export function clearCache(): void {
  apiCache.clear();
}

export function resetCache(): void {
  apiCache.reset();
}

// キャッシュミドルウェア
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    ttl?: number;
    keyGenerator?: (req: NextRequest) => string;
    varyHeaders?: string[];
  } = {}
) {
  const { ttl = 30000, keyGenerator, varyHeaders = [] } = options;
  
  return async (req: NextRequest) => {
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : generateDefaultCacheKey(req, varyHeaders);
    
    // GETリクエストのみキャッシュ
    if (req.method !== 'GET') {
      return handler(req);
    }
    
    // キャッシュをチェック
    const cached = apiCache.getEntry(cacheKey);
    if (cached) {
      const response = NextResponse.json(cached.data);
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('X-Cache-Age', String(Math.floor((Date.now() - cached.timestamp) / 1000)));
      return response;
    }
    
    // レスポンスを生成
    const response = await handler(req);
    
    // キャッシュに保存
    if (response.ok) {
      const responseData = await response.json();
      apiCache.set(cacheKey, responseData, ttl);
      
      const newResponse = NextResponse.json(responseData);
      newResponse.headers.set('X-Cache', 'MISS');
      newResponse.headers.set('X-Cache-TTL', String(ttl / 1000));
      
      return newResponse;
    }
    
    return response;
  };
}

// デフォルトキャッシュキー生成
function generateDefaultCacheKey(req: NextRequest, varyHeaders: string[] = []): string {
  const url = req.url;
  const urlObj = new URL(url);
  const varyParams = varyHeaders.map((header: string) => req.headers.get(header)).filter(Boolean);
  
  // URLパスとクエリパラメータを含める
  return `${urlObj.pathname}${urlObj.search}:${varyParams.join('|')}`;
}

// ストックデータ専用キャッシュ
export function withStockCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  ttl = 60000 // 1分
) {
  return withCache(handler, {
    ttl,
    keyGenerator: (req) => {
      let urlObj;
      try {
        urlObj = new URL(req.url);
      } catch {
        urlObj = new URL(req.url, 'http://localhost:3000');
      }
      const { searchParams } = urlObj;
      const symbol = searchParams.get('symbol');
      return `stock:${symbol}`;
    }
  });
}

// ポートフォリオデータ専用キャッシュ
export function withPortfolioCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  ttl = 5000 // 5秒
) {
  return withCache(handler, {
    ttl,
    keyGenerator: () => 'portfolio'
  });
}

// バックテストデータ専用キャッシュ
export function withBacktestCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  ttl = 300000 // 5分
) {
  return withCache(handler, {
    ttl,
    keyGenerator: (req) => {
      const { searchParams } = new URL(req.url);
      const symbol = searchParams.get('symbol');
      const period = searchParams.get('period');
      return `backtest:${symbol}:${period}`;
    }
  });
}

// キャッシュ管理API
export async function GET(_req: NextRequest) {
  const stats = apiCache.getStats();
  
  return NextResponse.json({
    cache: {
      ...stats,
      maxSize: 100,
      hitRate: 'N/A' // 実装は省略
    },
    timestamp: new Date().toISOString()
  });
}

// キャッシュクリアAPI
export async function DELETE(_req: NextRequest) {
  apiCache.clear();
  
  return NextResponse.json({
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
}
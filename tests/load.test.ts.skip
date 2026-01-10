import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import http from 'http';
import { Writable } from 'stream';

// 負荷テスト設定
interface LoadTestConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  duration: number; // ミリ秒
  concurrentUsers: number;
  rampUpTime?: number; // 渐増時間（ミリ秒）
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ timestamp: number; error: string; responseTime?: number }>;
}

// 負荷テスト実装
class LoadTestRunner {
  private results: Array<{ timestamp: number; responseTime: number; success: boolean; error?: string }> = [];
  private startTime: number = 0;
  private endTime: number = 0;

  async runTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log(`Starting load test: ${config.method} ${config.url}`);
    console.log(`Concurrent users: ${config.concurrentUsers}`);
    console.log(`Duration: ${config.duration}ms`);

    this.startTime = Date.now();
    this.results = [];

    // 渐増的にリクエストを開始
    const rampUpDelay = config.rampUpTime ? config.rampUpTime / config.concurrentUsers : 0;
    
    const promises: Promise<void>[] = [];
    for (let i = 0; i < config.concurrentUsers; i++) {
      if (i > 0 && rampUpDelay > 0) {
        await this.delay(rampUpDelay);
      }
      
      promises.push(this.userLoop(config));
    }

    await Promise.all(promises);
    this.endTime = Date.now();

    return this.analyzeResults();
  }

  private async userLoop(config: LoadTestConfig): Promise<void> {
    const endTime = Date.now() + config.duration;
    
    while (Date.now() < endTime) {
      try {
        const responseTime = await this.makeRequest(config);
        this.results.push({
          timestamp: Date.now(),
          responseTime,
          success: true
        });
      } catch (error) {
        this.results.push({
          timestamp: Date.now(),
          responseTime: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // 少し待機してサーバーに負荷をかけすぎないように
      await this.delay(100);
    }
  }

  private async makeRequest(config: LoadTestConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: 3000,
        path: new URL(config.url).pathname,
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve(responseTime);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (config.body) {
        req.write(config.body);
      }
      
      req.end();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private analyzeResults(): LoadTestResult {
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    const responseTimes = successful.map(r => r.responseTime);
    const totalDuration = this.endTime - this.startTime;

    return {
      totalRequests: this.results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      requestsPerSecond: this.results.length / (totalDuration / 1000),
      errors: failed.map(f => ({
        timestamp: f.timestamp,
        error: f.error || 'Unknown error',
        responseTime: f.responseTime
      }))
    };
  }
}

// テストケース
describe('Load Tests', () => {
  let runner: LoadTestRunner;

  beforeAll(() => {
    runner = new LoadTestRunner();
  });

  describe('Stock API Load Test', () => {
    it('should handle 50 concurrent users for 10 seconds', async () => {
      const config: LoadTestConfig = {
        url: 'http://localhost:3000/api/stock?symbol=AAPL',
        method: 'GET',
        duration: 10000,
        concurrentUsers: 50,
        rampUpTime: 2000
      };

      const result = await runner.runTest(config);

      console.log('Stock API Load Test Results:');
      console.log(`Total requests: ${result.totalRequests}`);
      console.log(`Successful: ${result.successfulRequests}`);
      console.log(`Failed: ${result.failedRequests}`);
      console.log(`Average response time: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`Requests per second: ${result.requestsPerSecond.toFixed(2)}`);

      // アサーション
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.95); // 95%以上成功
      expect(result.averageResponseTime).toBeLessThan(2000); // 2秒以内
      expect(result.requestsPerSecond).toBeGreaterThan(5); // 5 req/s以上
    });

    it('should handle API rate limiting', async () => {
      const config: LoadTestConfig = {
        url: 'http://localhost:3000/api/stock?symbol=AAPL',
        method: 'GET',
        duration: 5000,
        concurrentUsers: 150, // 高負荷
        headers: { 'API_KEY': 'test-key' }
      };

      const result = await runner.runTest(config);
      
      // レート制限が作動していることを確認
      expect(result.failedRequests).toBeGreaterThan(0);
      
      const rateLimitErrors = result.errors.filter(e => e.error.includes('Rate limit'));
      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Trade API Load Test', () => {
    it('should handle trade requests efficiently', async () => {
      const config: LoadTestConfig = {
        url: 'http://localhost:3000/api/trade',
        method: 'POST',
        body: JSON.stringify({
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 10,
          price: 150,
          reason: 'Load test trade'
        }),
        headers: { 'API_KEY': 'test-key' },
        duration: 8000,
        concurrentUsers: 20,
        rampUpTime: 1000
      };

      const result = await runner.runTest(config);

      console.log('Trade API Load Test Results:');
      console.log(`Total requests: ${result.totalRequests}`);
      console.log(`Successful: ${result.successfulRequests}`);
      console.log(`Average response time: ${result.averageResponseTime.toFixed(2)}ms`);

      // トードリクエストはより速い応答が必要
      expect(result.averageResponseTime).toBeLessThan(1000); // 1秒以内
      expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.9); // 90%以上成功
    });
  });

  describe('Mixed Load Test', () => {
    it('should handle mixed API requests', async () => {
      const configs: LoadTestConfig[] = [
        {
          url: 'http://localhost:3000/api/stock?symbol=AAPL',
          method: 'GET',
          duration: 6000,
          concurrentUsers: 30,
          rampUpTime: 1500
        },
        {
          url: 'http://localhost:3000/api/stock?symbol=GOOGL',
          method: 'GET',
          duration: 6000,
          concurrentUsers: 30,
          rampUpTime: 1500
        },
        {
          url: 'http://localhost:3000/api/trade',
          method: 'POST',
          body: JSON.stringify({
            symbol: 'MSFT',
            side: 'BUY',
            quantity: 5,
            price: 250,
            reason: 'Mixed load test'
          }),
          headers: { 'API_KEY': 'test-key' },
          duration: 6000,
          concurrentUsers: 10,
          rampUpTime: 2000
        }
      ];

      const results = await Promise.all(configs.map(config => runner.runTest(config)));
      
      const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
      const totalSuccessful = results.reduce((sum, r) => sum + r.successfulRequests, 0);
      const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length;

      console.log('Mixed Load Test Results:');
      console.log(`Total requests across all APIs: ${totalRequests}`);
      console.log(`Overall success rate: ${(totalSuccessful / totalRequests * 100).toFixed(2)}%`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);

      expect(totalSuccessful / totalRequests).toBeGreaterThan(0.9); // 90%以上成功
      expect(avgResponseTime).toBeLessThan(1500); // 1.5秒以内
    });
  });

  afterAll(() => {
    console.log('Load tests completed');
  });
});
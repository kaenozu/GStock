import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/trading/PaperTrader.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000, // 30秒タイムアウト
    hookTimeout: 10000
  },
  define: {
    ...loadEnv('test', process.cwd())
  }
});
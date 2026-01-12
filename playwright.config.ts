/**
 * Playwright E2E Test Configuration
 * @description GStockのE2Eテスト設定
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    // テストディレクトリ
    testDir: './e2e',
    
    // テストのタイムアウト
    timeout: 30 * 1000,
    
    // アサーションのタイムアウト
    expect: {
        timeout: 5000,
    },
    
    // 完全並列実行
    fullyParallel: true,
    
    // CIではリトライしない
    forbidOnly: !!process.env.CI,
    
    // リトライ回数（CIのみ）
    retries: process.env.CI ? 2 : 0,
    
    // ワーカー数
    workers: process.env.CI ? 1 : undefined,
    
    // レポーター
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
    ],
    
    // 共通設定
    use: {
        // ベースURL
        baseURL: 'http://localhost:3000',
        
        // 失敗時にスクリーンショットを取得
        screenshot: 'only-on-failure',
        
        // 失敗時にトレースを保存
        trace: 'on-first-retry',
        
        // ビデオは無効
        video: 'off',
    },
    
    // ブラウザ設定
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    
    // ローカル開発サーバー（既に起動している前提）
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true, // 常に既存サーバーを再利用
        timeout: 120 * 1000,
    },
});

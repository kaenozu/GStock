import { test, expect } from '@playwright/test';

test.describe('GStock エラーハンドリング', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Error Boundaryがエラーをキャッチすること', async ({ page }) => {
        // 通知をモック
        await page.route('**/api/**', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Test error' }),
            });
        });

        // エラーをトリガー
        await page.goto('/api/stock?symbol=AAPL');

        await expect(page.locator('text=エラーが発生しました')).toBeVisible();
    });

    test('エラーからリセットできること', async ({ page }) => {
        await page.route('**/api/**', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Test error' }),
            });
        });

        await page.goto('/api/stock?symbol=AAPL');

        await expect(page.locator('text=エラーが発生しました')).toBeVisible();

        const resetButton = page.getByRole('button', { name: 'アプリケーションをリセット' });
        await resetButton.click();

        await expect(page.locator('text=エラーが発生しました')).not.toBeVisible();
    });
});

test.describe('GStock Rate Limiting', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('レート制限を超えたらエラーが表示されること', async ({ page, request }) => {
        let requestCount = 0;

        // レート制限をモック
        await page.route('**/api/**', route => {
            requestCount++;
            
            if (requestCount > 60) {
                route.fulfill({
                    status: 429,
                    contentType: 'application/json',
                    body: JSON.stringify({ 
                        error: 'Too many requests',
                        message: 'レート制限を超えました' 
                    }),
                });
            } else {
                route.continue();
            }
        });

        for (let i = 0; i < 65; i++) {
            await request.get('/api/stock?symbol=AAPL');
        }

        await expect(page.locator('text=レート制限を超えました')).toBeVisible();
    });

    test('レート制限ヘッダーが正しく設定されること', async ({ page }) => {
        await page.goto('/api/stock?symbol=AAPL');

        const response = await page.request.get('/api/stock?symbol=AAPL');
        
        expect(response.headers()).toHaveProperty('x-rate-limit-limit');
        expect(response.headers()).toHaveProperty('x-rate-limit-remaining');
        expect(response.headers()).toHaveProperty('x-rate-limit-reset');
    });
});

test.describe('GStock 入力検証', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('無効な銘柄コードでエラーが表示されること', async ({ page }) => {
        const settingsButton = page.getByLabel('設定');
        await settingsButton.click();

        // 銘柄入力欄を見つける（もしあれば）
        const symbolInput = page.locator('input[placeholder*="銘柄"]');
        
        if (await symbolInput.count() > 0) {
            await symbolInput.fill('INVALID123');
            
            await expect(page.locator('text=無効な銘柄コードです')).toBeVisible();
        }
    });

    test('無効なAPIキーでエラーが表示されること', async ({ page }) => {
        const settingsButton = page.getByLabel('設定');
        await settingsButton.click();

        const apiTab = page.getByText('APIキー');
        await apiTab.click();

        const apiKeyInput = page.getByPlaceholder('APIキーを入力');
        await apiKeyInput.fill('invalid');

        const saveButton = page.getByRole('button', { name: '保存' });
        await saveButton.click();

        await expect(page.locator('text=APIキーが無効です')).toBeVisible();
    });
});

test.describe('GStock セキュリティヘッダー', () => {
    test('X-Frame-Optionsヘッダーが設定されていること', async ({ page, request }) => {
        const response = await request.get('/');
        
        expect(response.headers()).toHaveProperty('x-frame-options', 'DENY');
    });

    test('X-Content-Type-Optionsヘッダーが設定されていること', async ({ page, request }) => {
        const response = await request.get('/');
        
        expect(response.headers()).toHaveProperty('x-content-type-options', 'nosniff');
    });

    test('X-XSS-Protectionヘッダーが設定されていること', async ({ page, request }) => {
        const response = await request.get('/');
        
        expect(response.headers()).toHaveProperty('x-xss-protection', '1; mode=block');
    });
});
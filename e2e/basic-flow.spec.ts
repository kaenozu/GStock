/**
 * Basic Flow E2E Tests
 * @description 基本フローの統合テスト
 */

import { test, expect } from '@playwright/test';

test.describe('基本フロー', () => {
    test('アプリが起動してスキャンが開始される', async ({ page }) => {
        await page.goto('/');
        
        // GStock Prime が表示される
        await expect(page.locator('h1').first()).toContainText('GStock Prime');
        
        // スキャンが開始される（ニューラルモニターが更新される）
        // 「スキャン中」か銀柄名が表示されるまで待つ
        await expect(page.locator('text=/スキャン中|NVDA|AAPL|TSLA|MSFT|GOOGL/')).toBeVisible({ timeout: 15000 });
    });

    test.skip('オンボーディングが初回起動時に表示される', async ({ page, context }) => {
        // ローカルストレージをクリア
        await context.clearCookies();
        await page.goto('/');
        
        // localStorageをクリアしてリロード
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        // オンボーディングモーダルが表示される
        await expect(page.locator('text=GStockへようこそ')).toBeVisible({ timeout: 5000 });
        
        // スキップで閉じる
        await page.locator('button', { hasText: 'スキップ' }).click();
        
        // モーダルが閉じる
        await expect(page.locator('text=GStockへようこそ')).not.toBeVisible();
    });

    test.skip('銀柄検索が動作する', async ({ page }) => {
        await page.goto('/');
        
        // オンボーディングをスキップ（表示されている場合）
        const skipButton = page.locator('button', { hasText: 'スキップ' });
        if (await skipButton.isVisible()) {
            await skipButton.click();
        }
        
        // 検索ボックスが表示される
        const searchInput = page.locator('input[placeholder*="検索"]');
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        
        // 検索を実行
        await searchInput.fill('AAPL');
        
        // ドロップダウンが表示される
        await expect(page.locator('text=Apple Inc.')).toBeVisible({ timeout: 5000 });
    });

    test.skip('ウォッチリストに銀柄を追加できる', async ({ page }) => {
        // TODO: ウォッチリストUIのセレクターを修正後に有効化
        await page.goto('/');
        
        // NVDAの☆ボタンをクリック
        const nvdaStar = page.locator('div:has-text("NVDA") >> button').first();
        await nvdaStar.click();
        
        // ウォッチリストにNVDAが追加される
        await expect(page.locator('text=ウォッチリストは空です')).not.toBeVisible({ timeout: 5000 });
    });

    test('Tradeタブでポートフォリオが表示される', async ({ page }) => {
        await page.goto('/');
        
        // Tradeタブをクリック
        await page.locator('button', { hasText: 'Trade' }).click();
        
        // 仮想ポートフォリオが表示される
        await expect(page.locator('text=仮想ポートフォリオ')).toBeVisible({ timeout: 10000 });
        
        // 買い/売りボタンが表示される
        await expect(page.locator('button', { hasText: '買い' })).toBeVisible();
        await expect(page.locator('button', { hasText: '売り' })).toBeVisible();
    });

    test('Configタブでアラート設定が表示される', async ({ page }) => {
        await page.goto('/');
        
        // Configタブをクリック
        await page.locator('button', { hasText: 'Config' }).click();
        
        // アラート設定が表示される
        await expect(page.locator('text=アラート設定')).toBeVisible({ timeout: 10000 });
    });

    test.skip('ヘルプボタンでオンボーディングを再表示できる', async ({ page }) => {
        await page.goto('/');
        
        // オンボーディングをスキップ
        const skipButton = page.locator('button', { hasText: 'スキップ' });
        if (await skipButton.isVisible()) {
            await skipButton.click();
        }
        
        // ヘルプボタンをクリック
        const helpButton = page.locator('button[aria-label="ヘルプ"]');
        await helpButton.click();
        
        // オンボーディングが再表示される
        await expect(page.locator('text=GStockへようこそ')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('APIエラーハンドリング', () => {
    test('APIキーなしでもアプリが動作する', async ({ page }) => {
        await page.goto('/');
        
        // エラーでクラッシュしない
        await expect(page.locator('h1').first()).toContainText('GStock Prime');
        
        // 15秒待っても動作し続ける
        await page.waitForTimeout(15000);
        await expect(page.locator('h1').first()).toContainText('GStock Prime');
    });
});

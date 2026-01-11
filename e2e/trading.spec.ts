/**
 * Trading E2E Tests
 * @description 取引機能のE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('取引パネル', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Tradeタブに移動
        await page.locator('button', { hasText: 'Trade' }).click();
        // パネルが読み込まれるまで待機
        await expect(page.locator('text=仮想ポートフォリオ')).toBeVisible({ timeout: 15000 });
    });

    test('ポートフォリオ情報が表示される', async ({ page }) => {
        // 現金残高が表示される
        await expect(page.locator('text=現金残高')).toBeVisible();
        // 総評価額が表示される
        await expect(page.locator('text=総評価額')).toBeVisible();
    });

    test('買いボタンが表示される', async ({ page }) => {
        const buyButton = page.locator('button', { hasText: '買い 100' });
        await expect(buyButton).toBeVisible();
        await expect(buyButton).toBeEnabled();
    });

    test('売りボタンが表示される', async ({ page }) => {
        const sellButton = page.locator('button', { hasText: '売り 100' });
        await expect(sellButton).toBeVisible();
    });

    test('取引履歴セクションが表示される', async ({ page }) => {
        await expect(page.locator('text=最近の取引')).toBeVisible();
    });

    test('CSVエクスポートボタンが存在する', async ({ page }) => {
        // 取引がある場合のみCSVボタンが表示される
        const csvButton = page.locator('button[aria-label="取引履歴をCSVでエクスポート"]');
        // ボタンが存在するか、または取引がないメッセージが表示される
        const hasButton = await csvButton.count() > 0;
        const hasNoTrades = await page.locator('text=取引履歴がありません').count() > 0;
        
        expect(hasButton || hasNoTrades).toBeTruthy();
    });
});

test.describe('モード切り替え', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('PAPERモードがデフォルト', async ({ page }) => {
        const modeButton = page.locator('button', { hasText: '模擬取引' });
        await expect(modeButton).toBeVisible();
    });

    test('LIVEモード切り替えに確認ダイアログが出る', async ({ page }) => {
        // ダイアログをキャンセルする設定
        page.on('dialog', async dialog => {
            expect(dialog.type()).toBe('confirm');
            expect(dialog.message()).toContain('LIVE');
            await dialog.dismiss(); // キャンセル
        });

        // モード切り替えボタンをクリック
        const modeButton = page.locator('button', { hasText: '模擬取引' });
        await modeButton.click();
    });
});

test.describe('ポートフォリオマネージャー', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('button', { hasText: 'Trade' }).click();
        await expect(page.locator('text=仮想ポートフォリオ')).toBeVisible({ timeout: 15000 });
    });

    test('ポートフォリオマネージャーが表示される', async ({ page }) => {
        // ポートフォリオマネージャーセクション
        await expect(page.locator('text=ポートフォリオ管理')).toBeVisible({ timeout: 10000 });
    });
});

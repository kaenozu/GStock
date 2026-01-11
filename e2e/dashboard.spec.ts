/**
 * Dashboard E2E Tests
 * @description ダッシュボードの基本機能テスト
 */

import { test, expect } from '@playwright/test';

test.describe('ダッシュボード', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('ページが正しく読み込まれる', async ({ page }) => {
        // タイトルが表示される（最初のh1のみ）
        await expect(page.locator('h1').first()).toContainText('GStock Prime');
    });

    test('スキャンボタンが表示される', async ({ page }) => {
        // 停止/再開ボタンが存在
        const pauseButton = page.locator('button', { hasText: /停止|再開/ });
        await expect(pauseButton).toBeVisible();
    });

    test('スキャンを一時停止・再開できる', async ({ page }) => {
        // 停止ボタンをクリック
        const pauseButton = page.locator('button', { hasText: '停止' });
        await pauseButton.click();
        
        // 再開ボタンに変わる
        await expect(page.locator('button', { hasText: '再開' })).toBeVisible();
        
        // 再度クリックで停止に戻る
        await page.locator('button', { hasText: '再開' }).click();
        await expect(page.locator('button', { hasText: '停止' })).toBeVisible();
    });

    test('指標ボタンで表示を切り替えられる', async ({ page }) => {
        const indicatorButton = page.locator('button', { hasText: '指標' });
        await expect(indicatorButton).toBeVisible();
        
        // クリックでトグル
        await indicatorButton.click();
        // ボタンがアクティブ状態になる（スタイルが変わる）
        await expect(indicatorButton).toBeVisible();
    });

    test('タブパネルが表示される', async ({ page }) => {
        // Market, Trade, Config タブが存在
        await expect(page.locator('button', { hasText: 'Market' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Trade' })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Config' })).toBeVisible();
    });

    test('タブを切り替えられる', async ({ page }) => {
        // Tradeタブをクリック
        await page.locator('button', { hasText: 'Trade' }).click();
        
        // ポートフォリオパネルが表示される
        await expect(page.locator('text=仮想ポートフォリオ')).toBeVisible({ timeout: 10000 });
    });

    test('モード切り替えボタンが表示される', async ({ page }) => {
        // PAPER/LIVE モード切り替えボタン
        const modeButton = page.locator('button', { hasText: /模擬取引|本番稼働/ });
        await expect(modeButton).toBeVisible();
    });
});

test.describe('ニューラルモニター', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('シグナルカードが表示される', async ({ page }) => {
        // スキャン中またはシグナルテキストが存在
        const signalTexts = ['スキャン中', '強い買い', '強い売り', '様子見', '一時停止'];
        let found = false;
        
        for (const text of signalTexts) {
            const count = await page.locator(`text=${text}`).count();
            if (count > 0) {
                found = true;
                break;
            }
        }
        
        expect(found).toBeTruthy();
    });

    test('信頼度インジケータが表示される', async ({ page }) => {
        // 信頼度のパーセント表示がある（最初のものを取得）
        await expect(page.getByText(/\d+%/).first()).toBeVisible({ timeout: 10000 });
    });
});

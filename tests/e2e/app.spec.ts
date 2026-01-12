import { test, expect } from '@playwright/test';

test.describe('GStock アプリケーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ホームページが正しく表示されること', async ({ page }) => {
    await expect(page).toHaveTitle(/GStock/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('設定パネルを開くことができること', async ({ page }) => {
    const settingsButton = page.getByLabel('設定');
    await settingsButton.click();

    await expect(page.locator('.panel')).toBeVisible();
    await expect(page.getByText('設定')).toBeVisible();
  });

  test('ダークモードを切り替えることができること', async ({ page }) => {
    const settingsButton = page.getByLabel('設定');
    await settingsButton.click();

    const themeTab = page.getByText('テーマ');
    await themeTab.click();

    const toggleButton = page.getByRole('button', { name: /テーマを切り替え/ });
    await toggleButton.click();

    await expect(page.locator('body')).toHaveClass(/dark/);
  });

  test('APIキーを設定できること', async ({ page }) => {
    const settingsButton = page.getByLabel('設定');
    await settingsButton.click();

    const apiTab = page.getByText('APIキー');
    await apiTab.click();

    const apiKeyInput = page.getByPlaceholder('APIキーを入力');
    await apiKeyInput.fill('test_api_key_12345');

    const saveButton = page.getByRole('button', { name: '保存' });
    await saveButton.click();

    await expect(page.getByText('保存しました')).toBeVisible();
  });

  test('プッシュ通知設定を開くことができること', async ({ page }) => {
    const settingsButton = page.getByLabel('設定');
    await settingsButton.click();

    const pushTab = page.getByText('通知');
    await pushTab.click();

    await expect(page.getByText('プッシュ通知設定')).toBeVisible();
  });
});
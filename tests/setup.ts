// 負荷テスト用セットアップ
import { beforeAll, afterAll } from 'vitest';

// テスト環境のセットアップ
beforeAll(async () => {
  console.log('Setting up load test environment...');
  
  // 必要があれば、テスト用のデータベースやモックサーバーを起動
  // process.env.NODE_ENV = 'test'; // readOnlyプロパティのためコメントアウト
  process.env.API_KEY = 'test-load-key';
  process.env.SKIP_AUTH = 'false';
});

afterAll(async () => {
  console.log('Cleaning up load test environment...');
  
  // テスト後のクリーンアップ
});
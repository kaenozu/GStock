// AIが常に監視するエリート銘柄リスト
export const MONITOR_LIST = [
  'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD'
];

// スキャン設定
export const SCAN_INTERVAL_MS = 5000; // 高速回転
export const DATA_REFRESH_INTERVAL_MS = 300000; // データの再取得間隔 (5分)
export const CONFIDENCE_THRESHOLD = 10; // ほぼ全てのシグナルを通す

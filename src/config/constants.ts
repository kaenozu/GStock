// AIが常に監視するエリート銘柄リスト
export const MONITOR_LIST = [
  'NVDA', // AI半導体。トレンドが明確。
  'TSLA', // 高ボラティリティ。テクニカル反発が狙いやすい。
  'AAPL', // 指標株。市場全体の方向性確認用。
  'UBER', // ギグエコノミー。
  'COIN', // 暗号資産関連。
  'MSFT', // AI/クラウドの巨人。
  'GOOGL', // 検索/広告の巨人。
  'AMZN', // EC/クラウド。
  'META', // SNS/メタバース。
  'AMD', // 半導体。NVDAの対抗馬。
];

// 日本株リスト (Phase 21で対応予定 - Yahoo Finance JPエンドポイント対応が必要)
export const JAPAN_STOCK_LIST = [
  '7203.T', // トヨタ
  '9984.T', // SBG
  '6758.T', // ソニー
];

// スキャン設定
export const SCAN_INTERVAL_MS = 5000; // 高速回転
export const DATA_REFRESH_INTERVAL_MS = 300000; // データの再取得間隔 (5分)
export const CONFIDENCE_THRESHOLD = 10; // ほぼ全てのシグナルを通す

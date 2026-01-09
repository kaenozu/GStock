// AIが常に監視するエリート銘柄リスト
export const MONITOR_LIST = [
  'NVDA', // AI半導体。トレンドが明確。
  'TSLA', // 高ボラティリティ。テクニカル反発が狙いやすい。
  '7203.T', // トヨタ。ハイブリッド対応確認用。
  '9984.T', // SBG。高ボラティリティ日本株。
  'AAPL', // 指標株。市場全体の方向性確認用。
  'UBER', // ギグエコノミー。
  'COIN', // 暗号資産関連。
  'MSFT', // AI/クラウドの巨人。
  '6758.T', // ソニー。グローバルエンタメ。
];

// スキャン設定
export const SCAN_INTERVAL_MS = 15000; // 1銘柄あたりの滞在時間
export const DATA_REFRESH_INTERVAL_MS = 300000; // データの再取得間隔 (5分)
export const CONFIDENCE_THRESHOLD = 65; // シグナルとして採用する確信度の閾値

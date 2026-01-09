// AIが常に監視するエリート銘柄リスト
export const MONITOR_LIST = [
  'NVDA', // AI半導体。トレンドが明確。
  'TSLA', // 高ボラティリティ。テクニカル反発が狙いやすい。
  'AMD',  // NVDA追随型。半導体セクターの補完。
  'PLTR', // AIソフトウェア。最近の出来高とボラティリティが優秀。
  'AAPL', // 指標株。市場全体の方向性確認用。
  '7203.T', // トヨタ。日本株の横綱。
  '9984.T', // SBG。日本株で最もボラティリティが高い銘柄の一つ。
  '6758.T', // ソニー。ハイテク・グローバル。
];

// スキャン設定
export const SCAN_INTERVAL_MS = 15000; // 1銘柄あたりの滞在時間
export const DATA_REFRESH_INTERVAL_MS = 300000; // データの再取得間隔 (5分)
export const CONFIDENCE_THRESHOLD = 65; // シグナルとして採用する確信度の閾値

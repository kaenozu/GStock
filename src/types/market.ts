export interface StockDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type StockTrend = 'UP' | 'DOWN' | 'NEUTRAL';
export type TradeSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TradeType = 'BUY' | 'SELL' | 'HOLD';

export interface PredictionPoint {
  time: string;
  value: number;
}

export interface ChartIndicators {
  sma20: PredictionPoint[];
  sma50: PredictionPoint[];
  upperBand: PredictionPoint[];
  lowerBand: PredictionPoint[];
}

export interface ChartSettings {
  showSMA20: boolean;
  showSMA50: boolean;
  showBollingerBands: boolean;
  showPredictions: boolean;
}

export type MarketRegime = 'BULL_TREND' | 'BEAR_TREND' | 'SIDEWAYS' | 'VOLATILE' | 'SQUEEZE';

export interface MarketStats {
  rsi: number;
  trend: StockTrend;
  adx: number;
  price: number;
  regime: MarketRegime;
}

// 循環参照を避けるため簡易的に定義
export interface OptimalParams {
  buyThreshold: number;
  sellThreshold: number;
}

export interface AnalysisResult {
  symbol?: string;
  predictions: PredictionPoint[];
  confidence: number;
  sentiment: TradeSentiment;
  marketRegime: MarketRegime;
  signals: string[];
  stats: MarketStats;
  price?: number;
  history?: StockDataPoint[]; // チャート表示用
  isRealtime?: boolean;
  chartIndicators?: ChartIndicators;
  // 自己最適化情報
  optimalParams?: OptimalParams;
  optimalProfit?: number; // 最適化した場合の期待利益率
  optimalWinRate?: number;
}

export interface TradeHistoryItem {
  symbol: string;
  type: TradeType;
  time: string;
  confidence: number;
}

export interface DisplaySignal {
  type: TradeType;
  text: string;
  action: string;
}

export interface WatchListItem {
  symbol: string;
  price: number;
  changePercent?: number;
  sentiment: TradeSentiment;
}

export interface ChartMarker {
  time: string;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text: string;
  size?: number;
}

export interface BacktestResult {
  /** 初期資金 */
  initialBalance: number;
  /** 取引回数 */
  trades: number;
  /** 純利益（手数料・スリッページ込み） */
  profit: number;
  /** 利益率（%） */
  profitPercent: number;
  /** 勝率（%） */
  winRate: number;
  /** 最終資金 */
  finalBalance: number;
  /** チャート描画用マーカー */
  markers: ChartMarker[];
  /** 総手数料 */
  totalCommission?: number;
}
// Earnings Tracker Types
export interface EarningsEvent {
  date: string;           // YYYY-MM-DD
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  surprise: number | null;  // EPS surprise %
  period: string;           // 'Q1 2024' etc
}

export interface EarningsData {
  symbol: string;
  nextEarningsDate: string | null;
  history: EarningsEvent[];
}

// Insider Sentiment Types
export interface InsiderSentimentData {
  symbol: string;
  year: number;
  month: number;
  change: number;      // Net buying/selling share value/volume
  mspr: number;        // Monthly Share Purchase Ratio
}

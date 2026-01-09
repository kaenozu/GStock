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

export interface MarketStats {
  rsi: number;
  trend: StockTrend;
  adx: number;
  price: number;
}

export interface AnalysisResult {
  symbol?: string;
  predictions: PredictionPoint[];
  confidence: number;
  sentiment: TradeSentiment;
  signals: string[];
  stats: MarketStats;
  price?: number;
  history?: StockDataPoint[]; // チャート表示用
  isRealtime?: boolean;
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

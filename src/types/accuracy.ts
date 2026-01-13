// Prediction Accuracy Types (Phase 18: The Mirror)

export interface PredictionRecord {
  id: string;
  timestamp: string;        // ISO date when prediction was made
  symbol: string;
  predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;       // 0-100
  priceAtPrediction: number;
  targetDate: string;       // ISO date for evaluation (next trading day)
  regime?: string;          // Market regime at prediction time
  // Filled after evaluation
  actualDirection?: 'UP' | 'DOWN' | 'FLAT';
  priceAtEvaluation?: number;
  isCorrect?: boolean;
  evaluatedAt?: string;
}

export interface AccuracyMetrics {
  totalPredictions: number;
  evaluatedPredictions: number;
  correctPredictions: number;
  hitRate: number;           // % of correct predictions
  bullishAccuracy: number;   // % of BULLISH predictions that were correct
  bearishAccuracy: number;   // % of BEARISH predictions that were correct
  averageConfidence: number;
  confidenceCalibration: number; // How well confidence matches actual accuracy
  byRegime: {
    [regime: string]: {
      total: number;
      correct: number;
      hitRate: number;
    };
  };
  recentTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface DailyAccuracy {
  date: string;
  hitRate: number;
  predictions: number;
}

export interface AccuracyReport {
  metrics: AccuracyMetrics;
  history: DailyAccuracy[];
  lastUpdated: string;
}

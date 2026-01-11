'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, TrendingDown, Minus, Activity, BarChart3, RefreshCw } from 'lucide-react';
import { AccuracyReport, AccuracyMetrics } from '@/types/accuracy';
import { AccuracyCalculator, PredictionLogger } from '@/lib/accuracy';
import { safeToLocaleTimeString } from '@/lib/utils/format';
import styles from './AccuracyPanel.module.css';

interface AccuracyPanelProps {
  currentSymbol?: string;
  currentPrice?: number;
  currentPrediction?: {
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    regime?: string;
  };
}

export const AccuracyPanel: React.FC<AccuracyPanelProps> = ({
  currentSymbol,
  currentPrice,
  currentPrediction,
}) => {
  const [report, setReport] = useState<AccuracyReport | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [lastLogged, setLastLogged] = useState<string | null>(null);

  // Load accuracy report
  const loadReport = useCallback(() => {
    const r = AccuracyCalculator.generateReport();
    setReport(r);
  }, []);

  useEffect(() => {
    loadReport();
    // Refresh every minute
    const interval = setInterval(loadReport, 60000);
    return () => clearInterval(interval);
  }, [loadReport]);

  // Log current prediction
  const handleLogPrediction = () => {
    if (!currentSymbol || !currentPrice || !currentPrediction) return;
    
    setIsLogging(true);
    try {
      PredictionLogger.log({
        symbol: currentSymbol,
        predictedDirection: currentPrediction.direction,
        confidence: currentPrediction.confidence,
        priceAtPrediction: currentPrice,
        regime: currentPrediction.regime as any,
      });
      setLastLogged(safeToLocaleTimeString(new Date()));
      loadReport();
    } finally {
      setIsLogging(false);
    }
  };

  // Evaluate pending predictions (would need price data)
  const handleEvaluatePending = async () => {
    const pending = PredictionLogger.getPending();
    if (pending.length === 0) return;
    
    // In real implementation, fetch current prices for each symbol
    // For now, we'll simulate with a placeholder
    for (const record of pending) {
      // This would normally fetch the actual price
      // PredictionLogger.evaluate(record.id, actualPrice);
    }
    loadReport();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING': return <TrendingUp size={14} className={styles.improving} />;
      case 'DECLINING': return <TrendingDown size={14} className={styles.declining} />;
      default: return <Minus size={14} className={styles.stable} />;
    }
  };

  const getHitRateColor = (rate: number) => {
    if (rate >= 60) return styles.good;
    if (rate >= 50) return styles.neutral;
    return styles.poor;
  };

  if (!report) {
    return (
      <div className={styles.panel}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

  const { metrics } = report;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h4>
          <Target size={16} /> 予測精度 (The Mirror)
        </h4>
        <button onClick={loadReport} className={styles.refreshBtn} title="更新">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Main Hit Rate */}
      <div className={styles.mainMetric}>
        <div className={styles.hitRateLabel}>Hit Rate</div>
        <div className={`${styles.hitRateValue} ${getHitRateColor(metrics.hitRate)}`}>
          {metrics.hitRate.toFixed(1)}%
        </div>
        <div className={styles.hitRateSub}>
          {metrics.correctPredictions} / {metrics.evaluatedPredictions} 正解
          {getTrendIcon(metrics.recentTrend)}
        </div>
      </div>

      {/* Direction Accuracy */}
      <div className={styles.directionGrid}>
        <div className={styles.directionItem}>
          <span className={styles.bullLabel}>🐂 強気予測</span>
          <span className={`${styles.directionValue} ${getHitRateColor(metrics.bullishAccuracy)}`}>
            {metrics.bullishAccuracy.toFixed(1)}%
          </span>
        </div>
        <div className={styles.directionItem}>
          <span className={styles.bearLabel}>🐻 弱気予測</span>
          <span className={`${styles.directionValue} ${getHitRateColor(metrics.bearishAccuracy)}`}>
            {metrics.bearishAccuracy.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Confidence Calibration */}
      <div className={styles.calibration}>
        <div className={styles.calibLabel}>
          <Activity size={12} /> 信頼度キャリブレーション
        </div>
        <div className={styles.calibValue}>
          {metrics.confidenceCalibration.toFixed(2)}
          <span className={styles.calibHint}>
            {metrics.confidenceCalibration > 1.1 ? '(過小評価)' : 
             metrics.confidenceCalibration < 0.9 ? '(過大評価)' : '(良好)'}
          </span>
        </div>
      </div>

      {/* Regime Performance */}
      {Object.entries(metrics.byRegime).some(([_, v]) => v.total > 0) && (
        <div className={styles.regimeSection}>
          <div className={styles.regimeLabel}>
            <BarChart3 size={12} /> 市場環境別精度
          </div>
          <div className={styles.regimeGrid}>
            {Object.entries(metrics.byRegime)
              .filter(([_, v]) => v.total > 0)
              .map(([regime, data]) => (
                <div key={regime} className={styles.regimeItem}>
                  <span className={styles.regimeName}>{regime.replace('_', ' ')}</span>
                  <span className={`${styles.regimeRate} ${getHitRateColor(data.hitRate)}`}>
                    {data.hitRate.toFixed(0)}%
                  </span>
                  <span className={styles.regimeCount}>({data.total})</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Log Prediction Button */}
      {currentSymbol && currentPrediction && (
        <div className={styles.logSection}>
          <button 
            onClick={handleLogPrediction} 
            disabled={isLogging}
            className={styles.logBtn}
          >
            {isLogging ? '記録中...' : `現在の予測を記録 (${currentSymbol})`}
          </button>
          {lastLogged && (
            <div className={styles.lastLogged}>最終記録: {lastLogged}</div>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div className={styles.footer}>
        <span>総予測: {metrics.totalPredictions}</span>
        <span>平均信頼度: {metrics.averageConfidence.toFixed(0)}%</span>
      </div>
    </div>
  );
};

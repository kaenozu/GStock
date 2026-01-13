/**
 * AccuracyCalculator - Calculates prediction accuracy metrics
 * Phase 18: The Mirror
 */

import { PredictionRecord, AccuracyMetrics, DailyAccuracy, AccuracyReport } from '@/types/accuracy';
import { PredictionLogger } from './PredictionLogger';

export class AccuracyCalculator {
  /**
   * Calculate comprehensive accuracy metrics
   */
  static calculate(records?: PredictionRecord[]): AccuracyMetrics {
    const allRecords = records || PredictionLogger.getAll();
    const evaluated = allRecords.filter(r => r.evaluatedAt);
    const correct = evaluated.filter(r => r.isCorrect);
    
    // Basic metrics
    const totalPredictions = allRecords.length;
    const evaluatedPredictions = evaluated.length;
    const correctPredictions = correct.length;
    const hitRate = evaluatedPredictions > 0 
      ? (correctPredictions / evaluatedPredictions) * 100 
      : 0;
    
    // Bullish accuracy
    const bullishPredictions = evaluated.filter(r => r.predictedDirection === 'BULLISH');
    const bullishCorrect = bullishPredictions.filter(r => r.isCorrect);
    const bullishAccuracy = bullishPredictions.length > 0
      ? (bullishCorrect.length / bullishPredictions.length) * 100
      : 0;
    
    // Bearish accuracy
    const bearishPredictions = evaluated.filter(r => r.predictedDirection === 'BEARISH');
    const bearishCorrect = bearishPredictions.filter(r => r.isCorrect);
    const bearishAccuracy = bearishPredictions.length > 0
      ? (bearishCorrect.length / bearishPredictions.length) * 100
      : 0;
    
    // Average confidence
    const averageConfidence = allRecords.length > 0
      ? allRecords.reduce((sum, r) => sum + r.confidence, 0) / allRecords.length
      : 0;
    
    // Confidence calibration (how well confidence matches actual accuracy)
    // Perfect calibration = 1.0, overconfident < 1.0, underconfident > 1.0
    const confidenceCalibration = averageConfidence > 0
      ? hitRate / averageConfidence
      : 0;
    
    // Accuracy by regime
    const byRegime: AccuracyMetrics['byRegime'] = {};
    const regimes = ['BULL_TREND', 'BEAR_TREND', 'SIDEWAYS', 'VOLATILE', 'SQUEEZE'];
    
    for (const regime of regimes) {
      const regimeRecords = evaluated.filter(r => r.regime === regime);
      const regimeCorrect = regimeRecords.filter(r => r.isCorrect);
      byRegime[regime] = {
        total: regimeRecords.length,
        correct: regimeCorrect.length,
        hitRate: regimeRecords.length > 0
          ? (regimeCorrect.length / regimeRecords.length) * 100
          : 0,
      };
    }
    
    // Recent trend (compare last 7 days vs previous 7 days)
    const recentTrend = this.calculateTrend(evaluated);
    
    return {
      totalPredictions,
      evaluatedPredictions,
      correctPredictions,
      hitRate: Math.round(hitRate * 10) / 10,
      bullishAccuracy: Math.round(bullishAccuracy * 10) / 10,
      bearishAccuracy: Math.round(bearishAccuracy * 10) / 10,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      confidenceCalibration: Math.round(confidenceCalibration * 100) / 100,
      byRegime,
      recentTrend,
    };
  }
  
  /**
   * Get daily accuracy history for charting
   */
  static getDailyHistory(days: number = 30): DailyAccuracy[] {
    const records = PredictionLogger.getAll().filter(r => r.evaluatedAt);
    const history: DailyAccuracy[] = [];
    
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = records.filter(r => 
        r.evaluatedAt && r.evaluatedAt.startsWith(dateStr)
      );
      
      const correct = dayRecords.filter(r => r.isCorrect);
      const hitRate = dayRecords.length > 0
        ? (correct.length / dayRecords.length) * 100
        : 0;
      
      history.push({
        date: dateStr,
        hitRate: Math.round(hitRate * 10) / 10,
        predictions: dayRecords.length,
      });
    }
    
    return history;
  }
  
  /**
   * Generate full accuracy report
   */
  static generateReport(): AccuracyReport {
    return {
      metrics: this.calculate(),
      history: this.getDailyHistory(30),
      lastUpdated: new Date().toISOString(),
    };
  }
  
  /**
   * Calculate if accuracy is improving, declining, or stable
   */
  private static calculateTrend(evaluated: PredictionRecord[]): 'IMPROVING' | 'DECLINING' | 'STABLE' {
    if (evaluated.length < 14) return 'STABLE';
    
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const recent = evaluated.filter(r => 
      r.evaluatedAt && new Date(r.evaluatedAt) >= sevenDaysAgo
    );
    const previous = evaluated.filter(r => 
      r.evaluatedAt && 
      new Date(r.evaluatedAt) >= fourteenDaysAgo && 
      new Date(r.evaluatedAt) < sevenDaysAgo
    );
    
    if (recent.length < 5 || previous.length < 5) return 'STABLE';
    
    const recentHitRate = recent.filter(r => r.isCorrect).length / recent.length;
    const previousHitRate = previous.filter(r => r.isCorrect).length / previous.length;
    
    const diff = recentHitRate - previousHitRate;
    
    if (diff > 0.05) return 'IMPROVING';
    if (diff < -0.05) return 'DECLINING';
    return 'STABLE';
  }
}

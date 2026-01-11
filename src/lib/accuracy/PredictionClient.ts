/**
 * PredictionClient - Client-side API wrapper for predictions
 * Replaces localStorage-based PredictionLogger with server API calls
 */

import { PredictionRecord, AccuracyMetrics, AccuracyReport } from '@/types/accuracy';
import { MarketRegime } from '@/types/market';

export class PredictionClient {
    /**
     * Log a new prediction via API
     */
    static async log(params: {
        symbol: string;
        predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        confidence: number;
        priceAtPrediction: number;
        regime?: MarketRegime;
    }): Promise<PredictionRecord | null> {
        try {
            const res = await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            
            if (!res.ok) return null;
            const data = await res.json();
            return data.prediction;
        } catch {
            console.error('[PredictionClient] Failed to log prediction');
            return null;
        }
    }
    
    /**
     * Auto-log prediction (skips if already logged today)
     */
    static async autoLog(params: {
        symbol: string;
        predictedDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        confidence: number;
        priceAtPrediction: number;
        regime?: MarketRegime;
    }): Promise<boolean> {
        try {
            const res = await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...params, autoLog: true }),
            });
            
            if (!res.ok) return false;
            const data = await res.json();
            return data.logged === true;
        } catch {
            console.error('[PredictionClient] Failed to auto-log prediction');
            return false;
        }
    }
    
    /**
     * Get all predictions
     */
    static async getAll(): Promise<PredictionRecord[]> {
        try {
            const res = await fetch('/api/predictions');
            if (!res.ok) return [];
            const data = await res.json();
            return data.predictions || [];
        } catch {
            console.error('[PredictionClient] Failed to fetch predictions');
            return [];
        }
    }
    
    /**
     * Get pending predictions
     */
    static async getPending(): Promise<PredictionRecord[]> {
        try {
            const res = await fetch('/api/predictions?type=pending');
            if (!res.ok) return [];
            const data = await res.json();
            return data.predictions || [];
        } catch {
            console.error('[PredictionClient] Failed to fetch pending predictions');
            return [];
        }
    }
    
    /**
     * Get predictions for a symbol
     */
    static async getBySymbol(symbol: string): Promise<PredictionRecord[]> {
        try {
            const res = await fetch(`/api/predictions?symbol=${symbol}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.predictions || [];
        } catch {
            console.error('[PredictionClient] Failed to fetch predictions for symbol');
            return [];
        }
    }
    
    /**
     * Evaluate a prediction
     */
    static async evaluate(id: string, actualPrice: number): Promise<PredictionRecord | null> {
        try {
            const res = await fetch('/api/predictions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, actualPrice }),
            });
            
            if (!res.ok) return null;
            const data = await res.json();
            return data.prediction;
        } catch {
            console.error('[PredictionClient] Failed to evaluate prediction');
            return null;
        }
    }
    
    /**
     * Calculate accuracy metrics from predictions
     */
    static calculateMetrics(records: PredictionRecord[]): AccuracyMetrics {
        const evaluated = records.filter(r => r.evaluatedAt);
        const correct = evaluated.filter(r => r.isCorrect);
        
        const totalPredictions = records.length;
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
        const averageConfidence = records.length > 0
            ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length
            : 0;
        
        // Confidence calibration
        const confidenceCalibration = averageConfidence > 0
            ? hitRate / averageConfidence
            : 0;
        
        // By regime
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
        
        // Recent trend
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
     * Generate full report
     */
    static async generateReport(): Promise<AccuracyReport> {
        const predictions = await this.getAll();
        const metrics = this.calculateMetrics(predictions);
        const history = this.getDailyHistory(predictions, 30);
        
        return {
            metrics,
            history,
            lastUpdated: new Date().toISOString(),
        };
    }
    
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
        
        const recentRate = recent.filter(r => r.isCorrect).length / recent.length;
        const previousRate = previous.filter(r => r.isCorrect).length / previous.length;
        
        const diff = recentRate - previousRate;
        if (diff > 0.05) return 'IMPROVING';
        if (diff < -0.05) return 'DECLINING';
        return 'STABLE';
    }
    
    private static getDailyHistory(records: PredictionRecord[], days: number) {
        const evaluated = records.filter(r => r.evaluatedAt);
        const history = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayRecords = evaluated.filter(r => 
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
}

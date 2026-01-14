import { Agent, AgentResult } from './types';
import { MarketRegime } from '@/types/market';

interface AgentPerformance {
    agentId: string;
    agentRole: string;
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    recentAccuracy: number;
    volatility: number;
    consistency: number;
    profitability: number;
    lastUpdated: number;
    totalProfit?: number;
    recentPredictions?: PredictionRecord[];
}

interface PredictionRecord {
    correct: boolean;
    accuracyAtTime: number;
    timestamp: number;
    confidence: number;
    profit?: number;
}

interface MarketRegimeData {
    currentRegime: MarketRegime;
    regimeHistory: Array<{
        regime: MarketRegime;
        timestamp: number;
        confidence: number;
    }>;
}

export class DynamicWeightingEngine {
    private agentPerformance: Map<string, AgentPerformance> = new Map();
    private marketRegime: MarketRegimeData;
    private readonly WEIGHT_BASE = 1.0;
    private readonly ACCURACY_WEIGHT = 0.4;
    private readonly CONSISTENCY_WEIGHT = 0.3;
    private readonly PROFITABILITY_WEIGHT = 0.3;

    constructor() {
        this.marketRegime = {
            currentRegime: 'SIDEWAYS',
            regimeHistory: []
        };
    }

    recordPrediction(
        agentId: string,
        agentRole: string,
        prediction: AgentResult,
        actualDirection: 'UP' | 'DOWN' | 'NEUTRAL',
        realizedProfit?: number
    ): void {
        const perf = this.getOrCreatePerformance(agentId, agentRole);

        const isCorrect = this.isPredictionCorrect(prediction, actualDirection);

        perf.totalPredictions++;
        if (isCorrect) {
            perf.correctPredictions++;
        }

        perf.accuracy = perf.correctPredictions / perf.totalPredictions;
        perf.lastUpdated = Date.now();

        // Record profit for monetization
        if (realizedProfit !== undefined) {
            perf.totalProfit = (perf.totalProfit || 0) + realizedProfit;
            perf.profitability = this.calculateProfitabilityScore(perf);
        }

        const record: PredictionRecord = {
            correct: isCorrect,
            accuracyAtTime: perf.accuracy,
            timestamp: Date.now(),
            confidence: prediction.confidence,
            profit: realizedProfit
        };

        if (!perf.recentPredictions) {
            perf.recentPredictions = [];
        }
        perf.recentPredictions.push(record);

        // Keep only last 100 predictions
        if (perf.recentPredictions.length > 100) {
            perf.recentPredictions = perf.recentPredictions.slice(-100);
        }

        // Update derived metrics
        this.updateDerivedMetrics(agentId);
    }

    calculateDynamicWeights(agents: Agent[]): Record<string, number> {
        const weights: Record<string, number> = {};

        for (const agent of agents) {
            const performance = this.agentPerformance.get(agent.id);
            
            if (!performance || performance.totalPredictions < 5) {
                // New agent gets neutral weight
                weights[agent.id] = this.WEIGHT_BASE;
                continue;
            }

            // Calculate weight components
            const accuracyScore = performance.accuracy;
            const consistencyScore = this.calculateConsistency(performance);
            const profitabilityScore = this.calculateProfitabilityScore(performance);

            // Combined weight calculation
            const combinedWeight = 
                (accuracyScore * this.ACCURACY_WEIGHT) +
                (consistencyScore * this.CONSISTENCY_WEIGHT) +
                (profitabilityScore * this.PROFITABILITY_WEIGHT);

            // Apply market regime adjustment
            const regimeAdjustedWeight = this.applyRegimeAdjustment(
                combinedWeight, 
                agent.role,
                this.marketRegime.currentRegime
            );

            weights[agent.id] = Math.max(0.1, Math.min(3.0, regimeAdjustedWeight));
        }

        return this.normalizeWeights(weights);
    }

    private getOrCreatePerformance(agentId: string, agentRole: string): AgentPerformance {
        let perf = this.agentPerformance.get(agentId);
        
        if (!perf) {
            perf = {
                agentId,
                agentRole,
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                recentAccuracy: 0,
                volatility: 0,
                consistency: 0.5,
                profitability: 0.5,
                lastUpdated: Date.now(),
                totalProfit: 0,
                recentPredictions: []
            };
            this.agentPerformance.set(agentId, perf);
        }
        
        return perf;
    }

    private isPredictionCorrect(prediction: AgentResult, actual: 'UP' | 'DOWN' | 'NEUTRAL'): boolean {
        const predictedSignal = prediction.signal;
        const predictedSentiment = prediction.sentiment;

        if (actual === 'UP') {
            return predictedSignal === 'BUY' || predictedSentiment === 'BULLISH';
        } else if (actual === 'DOWN') {
            return predictedSignal === 'SELL' || predictedSentiment === 'BEARISH';
        } else {
            return predictedSignal === 'HOLD' || predictedSentiment === 'NEUTRAL';
        }
    }

    private calculateConsistency(performance: AgentPerformance): number {
        if (!performance.recentPredictions || performance.recentPredictions.length < 10) {
            return 0.5;
        }

        const recent = performance.recentPredictions.slice(-20);
        const correctCount = recent.filter(p => p.correct).length;
        return correctCount / recent.length;
    }

    private calculateProfitabilityScore(performance: AgentPerformance): number {
        if (!performance.totalProfit || performance.totalPredictions < 10) {
            return 0.5;
        }

        // Normalize profit by prediction count
        const avgProfitPerPrediction = performance.totalProfit / performance.totalPredictions;
        
        // Score based on average profit (positive profit = higher score)
        return Math.max(0, Math.min(2.0, 0.5 + avgProfitPerPrediction * 10));
    }

    private applyRegimeAdjustment(
        baseWeight: number, 
        agentRole: string, 
        regime: MarketRegime
    ): number {
        const adjustments: Record<string, Record<string, number>> = {
            'BULL_TREND': {
                'CHAIRMAN': 1.2,
                'TREND': 1.5,
                'REVERSAL': 0.8,
                'VOLATILE': 1.0,
                'MULTI_TIMEFRAME': 1.1
            },
            'BEAR_TREND': {
                'CHAIRMAN': 1.2,
                'TREND': 1.3,
                'REVERSAL': 1.4,
                'VOLATILE': 1.2,
                'MULTI_TIMEFRAME': 1.1
            },
            'SIDEWAYS': {
                'CHAIRMAN': 1.0,
                'TREND': 0.8,
                'REVERSAL': 1.2,
                'VOLATILE': 0.7,
                'MULTI_TIMEFRAME': 1.3
            },
            'VOLATILE': {
                'CHAIRMAN': 1.1,
                'TREND': 0.7,
                'REVERSAL': 0.8,
                'VOLATILE': 1.5,
                'MULTI_TIMEFRAME': 1.0
            },
            'SQUEEZE': {
                'CHAIRMAN': 1.3,
                'TREND': 0.9,
                'REVERSAL': 1.1,
                'VOLATILE': 0.6,
                'MULTI_TIMEFRAME': 1.2
            }
        };

        const regimeAdjustments = adjustments[regime] || adjustments['SIDEWAYS'];
        const adjustment = regimeAdjustments[agentRole] || 1.0;

        return baseWeight * adjustment;
    }

    private normalizeWeights(weights: Record<string, number>): Record<string, number> {
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        
        if (totalWeight === 0) {
            return weights;
        }

        const normalized: Record<string, number> = {};
        for (const [agentId, weight] of Object.entries(weights)) {
            normalized[agentId] = weight / totalWeight;
        }

        return normalized;
    }

    private updateDerivedMetrics(agentId: string): void {
        const perf = this.agentPerformance.get(agentId);
        if (!perf) return;

        // Update recent accuracy (last 20 predictions)
        if (perf.recentPredictions && perf.recentPredictions.length >= 10) {
            const recent = perf.recentPredictions.slice(-20);
            const correctCount = recent.filter(p => p.correct).length;
            perf.recentAccuracy = correctCount / recent.length;
        }

        // Update volatility (standard deviation of recent accuracy)
        if (perf.recentPredictions && perf.recentPredictions.length >= 20) {
        const accuracies = perf.recentPredictions.map(p => p.correct ? 1 : 0);
        const mean = accuracies.reduce((a: number, b: number) => a + b, 0) / accuracies.length;
        const variance = accuracies.reduce((sum: number, acc: number) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length;
            perf.volatility = Math.sqrt(variance);
        }

        // Update consistency (inverse of volatility)
        perf.consistency = Math.max(0, 1 - perf.volatility);
    }

    updateMarketRegime(regime: MarketRegime, confidence: number = 1.0): void {
        this.marketRegime.currentRegime = regime;
        this.marketRegime.regimeHistory.push({
            regime,
            timestamp: Date.now(),
            confidence
        });

        // Keep only last 50 regime changes
        if (this.marketRegime.regimeHistory.length > 50) {
            this.marketRegime.regimeHistory = this.marketRegime.regimeHistory.slice(-50);
        }
    }

    getAgentPerformance(agentId: string): AgentPerformance | undefined {
        return this.agentPerformance.get(agentId);
    }

    getAllPerformance(): Map<string, AgentPerformance> {
        return new Map(this.agentPerformance);
    }

    getCurrentRegime(): MarketRegime {
        return this.marketRegime.currentRegime;
    }

    resetPerformance(agentId?: string): void {
        if (agentId) {
            this.agentPerformance.delete(agentId);
        } else {
            this.agentPerformance.clear();
        }
    }

    // ML Integration hooks for future enhancement
    getTrainingData(): Array<{
        agentId: string;
        features: number[];
        target: number;
    }> {
        const trainingData: Array<{ agentId: string; features: number[]; target: number }> = [];

        for (const [agentId, performance] of this.agentPerformance.entries()) {
            if (performance.totalPredictions >= 20) {
                const features = [
                    performance.accuracy,
                    performance.recentAccuracy,
                    performance.volatility,
                    performance.consistency,
                    performance.profitability,
                    performance.totalPredictions,
                    performance.totalProfit || 0
                ];

                const target = performance.accuracy; // Target is accuracy for ML model

                trainingData.push({ agentId, features, target });
            }
        }

        return trainingData;
    }
}
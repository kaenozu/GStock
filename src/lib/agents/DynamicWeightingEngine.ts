import { Agent, AgentResult } from '@/lib/agents/types';

export interface AgentPerformance {
    agentId: string;
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    recentAccuracy: number;
    volatility: number;
    lastUpdated: number;
}

export interface WeightedConsensusConfig {
    minConfidenceThreshold: number;
    accuracyWeight: number;
    consistencyWeight: number;
    recencyWeight: number;
    baseWeights: Record<string, number>;
}

interface PredictionRecord {
    correct: boolean;
    accuracyAtTime: number;
    timestamp: number;
}

export class DynamicWeightingEngine {
    private performance: Map<string, AgentPerformance>;
    private predictionHistory: Map<string, PredictionRecord[]>;
    private accuracyHistory: Map<string, number[]>;
    private config: WeightedConsensusConfig;
    private readonly maxHistorySize = 100;

    constructor(config: Partial<WeightedConsensusConfig> = {}) {
        this.performance = new Map();
        this.predictionHistory = new Map();
        this.accuracyHistory = new Map();
        this.config = {
            minConfidenceThreshold: config.minConfidenceThreshold ?? 0.5,
            accuracyWeight: config.accuracyWeight ?? 0.5,
            consistencyWeight: config.consistencyWeight ?? 0.3,
            recencyWeight: config.recencyWeight ?? 0.2,
            baseWeights: config.baseWeights ?? {
                CHAIRMAN: 2.0,
                VOLATILE: 1.5,
                TREND: 1.0,
                REVERSAL: 1.0,
                FUNDAMENTAL: 1.0,
                SENTIMENT: 0.8,
                MACRO: 0.5,
                OPTION: 0.7
            }
        };
    }

    recordPrediction(
        agentId: string,
        agentRole: string,
        prediction: AgentResult,
        actualDirection: 'UP' | 'DOWN' | 'NEUTRAL'
    ): void {
        const perf = this.getOrCreatePerformance(agentId, agentRole);

        const isCorrect = this.isPredictionCorrect(prediction, actualDirection);

        perf.totalPredictions++;
        if (isCorrect) {
            perf.correctPredictions++;
        }

        perf.accuracy = perf.correctPredictions / perf.totalPredictions;
        perf.lastUpdated = Date.now();

        this.performance.set(agentId, perf);

        const record: PredictionRecord = {
            correct: isCorrect,
            accuracyAtTime: perf.accuracy,
            timestamp: Date.now()
        };

        this.addToPredictionHistory(agentId, record);
        this.addToAccuracyHistory(agentId, perf.accuracy);
    }

    calculateWeights(agents: Agent[]): Record<string, number> {
        const weights: Record<string, number> = {};
        
        for (const agent of agents) {
            const perf = this.performance.get(agent.id);
            const baseWeight = this.config.baseWeights[agent.role] || 1.0;
            
            if (!perf || perf.totalPredictions < 10) {
                weights[agent.id] = baseWeight;
                continue;
            }

            const accuracyScore = perf.accuracy;
            const consistencyScore = 1 - (perf.volatility || 0);
            const recencyScore = perf.recentAccuracy || accuracyScore;

            const dynamicWeight = baseWeight * (
                accuracyScore * this.config.accuracyWeight +
                consistencyScore * this.config.consistencyWeight +
                recencyScore * this.config.recencyWeight
            );

            weights[agent.id] = Math.max(0.1, dynamicWeight);
        }

        return weights;
    }

    calculateConsensus(results: AgentResult[], agents: Agent[]): {
        consensusScore: number;
        consensusSignal: 'BUY' | 'SELL' | 'HOLD';
        confidence: number;
        usedWeights: Record<string, number>;
    } {
        const weights = this.calculateWeights(agents);
        
        let totalScore = 0;
        let totalWeight = 0;
        
        results.forEach((result, index) => {
            const agent = agents[index];
            const weight = weights[agent.id] || 1.0;
            
            let direction = 0;
            if (result.signal === 'BUY') direction = 1;
            else if (result.signal === 'SELL') direction = -1;
            
            const score = direction * result.confidence;
            totalScore += score * weight;
            totalWeight += weight;
        });

        const consensusScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        let consensusSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        if (consensusScore >= this.config.minConfidenceThreshold * 100) {
            consensusSignal = 'BUY';
        } else if (consensusScore <= -this.config.minConfidenceThreshold * 100) {
            consensusSignal = 'SELL';
        }

        const confidence = Math.min(Math.abs(consensusScore), 100);

        return {
            consensusScore,
            consensusSignal,
            confidence,
            usedWeights: weights
        };
    }

    updateConsistencyMetrics(): void {
        const now = Date.now();
        
        for (const [agentId, perf] of this.performance.entries()) {
            if (perf.totalPredictions < 20) continue;
            
            const recentPredictions = this.getRecentPredictions(agentId, 20);
            if (recentPredictions.length < 10) continue;
            
            const correctCount = recentPredictions.filter(p => p).length;
            perf.recentAccuracy = correctCount / recentPredictions.length;
            
            const recentAccuracyHistory = this.getAccuracyHistory(agentId, 10);
            if (recentAccuracyHistory.length >= 2) {
                const variance = this.calculateVariance(recentAccuracyHistory);
                perf.volatility = Math.min(variance, 1);
            }
        }
    }

    getPerformance(agentId: string): AgentPerformance | undefined {
        return this.performance.get(agentId);
    }

    getAllPerformance(): Map<string, AgentPerformance> {
        return new Map(this.performance);
    }

    resetAgent(agentId: string): void {
        this.performance.delete(agentId);
    }

    resetAll(): void {
        this.performance.clear();
        this.predictionHistory.clear();
        this.accuracyHistory.clear();
    }

    private getOrCreatePerformance(agentId: string, agentRole: string): AgentPerformance {
        let perf = this.performance.get(agentId);
        
        if (!perf) {
            perf = {
                agentId,
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                recentAccuracy: 0,
                volatility: 0,
                lastUpdated: Date.now()
            };
            this.performance.set(agentId, perf);
        }
        
        return perf;
    }

    private isPredictionCorrect(prediction: AgentResult, actual: 'UP' | 'DOWN' | 'NEUTRAL'): boolean {
        if (prediction.signal === 'HOLD') {
            return actual === 'NEUTRAL';
        }
        
        if (prediction.signal === 'BUY') {
            return actual === 'UP';
        }
        
        if (prediction.signal === 'SELL') {
            return actual === 'DOWN';
        }
        
        return false;
    }

    private getRecentPredictions(agentId: string, count: number): boolean[] {
        const history = this.predictionHistory.get(agentId) || [];
        return history.slice(-count).map(r => r.correct);
    }

    private getAccuracyHistory(agentId: string, count: number): number[] {
        const history = this.accuracyHistory.get(agentId) || [];
        return history.slice(-count);
    }

    private addToPredictionHistory(agentId: string, record: PredictionRecord): void {
        let history = this.predictionHistory.get(agentId) || [];
        history.push(record);

        if (history.length > this.maxHistorySize) {
            history = history.slice(-this.maxHistorySize);
        }

        this.predictionHistory.set(agentId, history);
    }

    private addToAccuracyHistory(agentId: string, accuracy: number): void {
        let history = this.accuracyHistory.get(agentId) || [];
        history.push(accuracy);

        if (history.length > this.maxHistorySize) {
            history = history.slice(-this.maxHistorySize);
        }

        this.accuracyHistory.set(agentId, history);
    }

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    }
}

export const defaultWeightingEngine = new DynamicWeightingEngine();

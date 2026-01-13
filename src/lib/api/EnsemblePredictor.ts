/**
 * EnsemblePredictor - アンサンブル予測器
 * @description 複数のAIエージェントの予測を統合して最終的なシグナルを生成
 * @module lib/api/EnsemblePredictor
 */

import { Agent, AgentResult, AgentRole } from '../agents/types';
import { StockDataPoint, MarketRegime } from '@/types/market';
import { TrendAgent } from '../agents/TrendAgent';
import { ReversalAgent } from '../agents/ReversalAgent';
import { VolatilityAgent } from '../agents/VolatilityAgent';
import { NewsSentimentAgent } from '../agents/NewsSentimentAgent';
import { MacroEconomicAgent } from '../agents/MacroEconomicAgent';
import { OptionFlowAgent } from '../agents/OptionFlowAgent';

/** アンサンブル結果 */
export interface EnsembleResult {
    finalSignal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    agentResults: AgentResult[];
    reasoning: string;
    weightedScore: number;
}

/** 重み付け設定 */
export interface EnsembleWeights {
    trend: number;
    reversal: number;
    volatility: number;
    fundamental: number;
    sentiment: number;
    macro: number;
    option: number;
}

/** マクロデータの型 */
interface MacroData {
    interestRate: number;
    inflationRate: number;
    gdpGrowth?: number;
    unemploymentRate?: number;
}

/** オプションフローデータの型 */
interface OptionFlowData {
    symbol: string;
    date: Date;
    callVolume: number;
    putVolume: number;
    callOI: number;
    putOI: number;
    impliedVolatility: number;
    institutionalActivity: 'HIGH' | 'MEDIUM' | 'LOW';
    maxPain?: number;
}

/**
 * アンサンブル予測器
 */
export class EnsemblePredictor {
    private agents: Map<string, Agent> = new Map();
    private weights: EnsembleWeights = {
        trend: 0.25,
        reversal: 0.15,
        volatility: 0.10,
        fundamental: 0.05,
        sentiment: 0.20,
        macro: 0.10,
        option: 0.15
    };

    private historicalPerformance: Map<string, { correct: number; total: number }> = new Map();

    constructor() {
        this.initializeAgents();
    }

    private initializeAgents(): void {
        this.agents.set('trend', new TrendAgent());
        this.agents.set('reversal', new ReversalAgent());
        this.agents.set('volatility', new VolatilityAgent());
        this.agents.set('sentiment', new NewsSentimentAgent());
        this.agents.set('macro', new MacroEconomicAgent());
        this.agents.set('option', new OptionFlowAgent());

        this.agents.forEach((_, id) => {
            this.historicalPerformance.set(id, { correct: 0, total: 0 });
        });
    }

    /**
     * 予測を実行
     */
    predict(
        stockData: StockDataPoint[],
        options?: {
            marketRegime?: MarketRegime;
            newsData?: string[];
            macroData?: MacroData;
            optionFlow?: OptionFlowData;
            customWeights?: Partial<EnsembleWeights>;
        }
    ): EnsembleResult {
        if (options?.customWeights) {
            this.updateWeights(options.customWeights);
        }

        const agentResults: AgentResult[] = [];

        for (const [id, agent] of this.agents) {
            let result: AgentResult;

            if (id === 'sentiment' && options?.newsData) {
                result = (agent as NewsSentimentAgent).analyze(stockData, options.marketRegime, options.newsData);
            } else if (id === 'macro' && options?.macroData) {
                result = (agent as MacroEconomicAgent).analyze(stockData, options.marketRegime, options.macroData);
            } else if (id === 'option' && options?.optionFlow) {
                result = (agent as OptionFlowAgent).analyze(stockData, options.marketRegime, options.optionFlow);
            } else {
                result = agent.analyze(stockData, options?.marketRegime);
            }

            agentResults.push(result);
        }

        const ensembleResult = this.calculateEnsemble(agentResults);

        return {
            ...ensembleResult,
            agentResults
        };
    }

    private calculateEnsemble(results: AgentResult[]): Omit<EnsembleResult, 'agentResults'> {
        let weightedScore = 0;
        const reasons: string[] = [];
        let totalWeight = 0;
        let totalConfidence = 0;

        for (const result of results) {
            const weight = this.getAgentWeight(result.role);
            const confidenceMultiplier = result.confidence / 100;

            const signalScore = this.signalToScore(result.signal);
            const weightedContribution = signalScore * weight * confidenceMultiplier;

            weightedScore += weightedContribution;
            totalWeight += weight * confidenceMultiplier;
            totalConfidence += result.confidence;

            if (Math.abs(signalScore) > 0.3) {
                reasons.push(`${result.name}: ${result.signal} (${result.confidence}%)`);
            }
        }

        const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        const avgConfidence = totalConfidence / results.length;

        let finalSignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let finalConfidence = avgConfidence;

        if (normalizedScore >= 0.3) {
            finalSignal = 'BUY';
            finalConfidence = Math.min(normalizedScore * 100, 100);
        } else if (normalizedScore <= -0.3) {
            finalSignal = 'SELL';
            finalConfidence = Math.min(Math.abs(normalizedScore) * 100, 100);
        } else {
            finalSignal = 'HOLD';
            finalConfidence = Math.max(avgConfidence - 30, 0);
        }

        const reasoning = reasons.length > 0
            ? reasons.join('; ')
            : 'Mixed or neutral signals from all agents';

        return {
            finalSignal,
            confidence: finalConfidence,
            weightedScore: normalizedScore,
            reasoning
        };
    }

    private getAgentWeight(role: AgentRole): number {
        const roleToWeightKey: Record<AgentRole, keyof EnsembleWeights> = {
            'TREND': 'trend',
            'REVERSAL': 'reversal',
            'VOLATILE': 'volatility',
            'FUNDAMENTAL': 'fundamental',
            'NEWS': 'sentiment',
            'MACRO': 'macro',
            'OPTION': 'option',
            'CHAIRMAN': 'fundamental',
            'MULTI_TIMEFRAME': 'trend'
        };

        return this.weights[roleToWeightKey[role]];
    }

    private signalToScore(signal: 'BUY' | 'SELL' | 'HOLD'): number {
        switch (signal) {
            case 'BUY': return 1;
            case 'SELL': return -1;
            case 'HOLD': return 0;
        }
    }

    updateWeights(newWeights: Partial<EnsembleWeights>): void {
        Object.assign(this.weights, newWeights);

        const totalWeight = Object.values(this.weights).reduce((a, b) => a + b, 0);
        if (totalWeight !== 1.0) {
            Object.keys(this.weights).forEach(key => {
                this.weights[key as keyof EnsembleWeights] =
                    this.weights[key as keyof EnsembleWeights] / totalWeight;
            });
        }
    }

    recordPerformance(agentId: string, correct: boolean): void {
        const performance = this.historicalPerformance.get(agentId);
        if (performance) {
            performance.total++;
            if (correct) {
                performance.correct++;
            }
        }
    }

    optimizeWeights(): void {
        this.agents.forEach((agent, id) => {
            const performance = this.historicalPerformance.get(id);
            if (performance && performance.total >= 10) {
                const accuracy = performance.correct / performance.total;
                const baseWeight = this.getAgentWeight(agent.role);

                const newWeight = baseWeight * (accuracy + 0.5);
                this.updateWeights({ [this.getAgentWeightKey(agent.role)]: newWeight });
            }
        });
    }

    private getAgentWeightKey(role: AgentRole): keyof EnsembleWeights {
        const roleToWeightKey: Record<AgentRole, keyof EnsembleWeights> = {
            'TREND': 'trend',
            'REVERSAL': 'reversal',
            'VOLATILE': 'volatility',
            'FUNDAMENTAL': 'fundamental',
            'NEWS': 'sentiment',
            'MACRO': 'macro',
            'OPTION': 'option',
            'CHAIRMAN': 'fundamental',
            'MULTI_TIMEFRAME': 'trend'
        };

        return roleToWeightKey[role];
    }

    getWeights(): EnsembleWeights {
        return { ...this.weights };
    }

    getAgentPerformance(): Map<string, { correct: number; total: number; accuracy: number }> {
        const performanceMap = new Map<string, { correct: number; total: number; accuracy: number }>();

        this.historicalPerformance.forEach((perf, id) => {
            performanceMap.set(id, {
                ...perf,
                accuracy: perf.total > 0 ? perf.correct / perf.total : 0
            });
        });

        return performanceMap;
    }
}

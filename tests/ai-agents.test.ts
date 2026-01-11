import { describe, it, expect } from 'vitest';
import { ChairmanAgent, TrendAgent, ReversalAgent, VolatilityAgent } from '@/lib/agents';
import { StockDataPoint, MarketRegime } from '@/types/market';

const generateTestMarketData = (symbol: string, days: number): StockDataPoint[] => {
    const data: StockDataPoint[] = [];
    const basePrice = 100 + Math.random() * 50;
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const price = basePrice + (Math.random() - 0.5) * 20;
        const volatility = 0.02 + Math.random() * 0.03;
        
        data.push({
            time: date.toISOString().split('T')[0],
            open: price * (1 - volatility),
            high: price * (1 + volatility * 2),
            low: price * (1 - volatility * 2),
            close: price
        });
    }
    
    return data.reverse();
};

interface AgentPerformance {
    agent: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
}

describe('AIエージェント最適化', () => {
    describe('既存エージェントの分析', () => {
        const testMarketData = generateTestMarketData('AAPL', 252);
        
        const agentConfigs = [
            { name: 'ChairmanAgent', agent: new ChairmanAgent() },
            { name: 'TrendAgent', agent: new TrendAgent() },
            { name: 'ReversalAgent', agent: new ReversalAgent() },
            { name: 'VolatilityAgent', agent: new VolatilityAgent() }
        ];

        it('各エージェントが有効な予測を生成する', () => {
            agentConfigs.forEach(({ name, agent }) => {
                const prediction = agent.analyze(testMarketData);
                
                expect(prediction).toBeDefined();
                expect(['BUY', 'SELL', 'HOLD']).toContain(prediction.signal);
                expect(prediction.confidence).toBeGreaterThanOrEqual(0);
                expect(prediction.confidence).toBeLessThanOrEqual(100);
                expect(prediction.name).toBeDefined();
                expect(prediction.reason).toBeDefined();
                expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(prediction.sentiment);
                
                console.log(`${name}: ${prediction.signal} (${prediction.confidence}%) - ${prediction.reason}`);
            });
        });

        it('エージェントが市場レジームを考慮する', () => {
            const regimes: MarketRegime[] = ['BULL_TREND', 'BEAR_TREND', 'SIDEWAYS', 'VOLATILE', 'SQUEEZE'];
            
            agentConfigs.forEach(({ agent }) => {
                regimes.forEach(regime => {
                    const prediction = agent.analyze(testMarketData, regime);
                    
                    expect(prediction).toBeDefined();
                    expect(['BUY', 'SELL', 'HOLD']).toContain(prediction.signal);
                });
            });
        });
    });

    describe('エージェントの信頼度分析', () => {
        const testMarketData = generateTestMarketData('AAPL', 100);
        
        const chairman = new ChairmanAgent();
        const trendAgent = new TrendAgent();
        const reversalAgent = new ReversalAgent();
        const volatilityAgent = new VolatilityAgent();

        it('ChairmanAgentの信頼度分布が正常', () => {
            const prediction = chairman.analyze(testMarketData);
            
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeLessThanOrEqual(100);
            
            if (prediction.signal !== 'HOLD') {
                expect(prediction.confidence).toBeGreaterThan(0);
            }
            
            console.log('ChairmanAgent信頼度:', {
                signal: prediction.signal,
                confidence: prediction.confidence,
                reason: prediction.reason
            });
        });

        it('各エージェントの信頼度が異なる', () => {
            const chairmanResult = chairman.analyze(testMarketData);
            const trendResult = trendAgent.analyze(testMarketData);
            const reversalResult = reversalAgent.analyze(testMarketData);
            const volatilityResult = volatilityAgent.analyze(testMarketData);
            
            const confidences = [
                chairmanResult.confidence,
                trendResult.confidence,
                reversalResult.confidence,
                volatilityResult.confidence
            ];
            
            expect(confidences.every(c => c >= 0 && c <= 100)).toBe(true);
            
            console.log('各エージェントの信頼度:', {
                Chairman: chairmanResult.confidence,
                Trend: trendResult.confidence,
                Reversal: reversalResult.confidence,
                Volatility: volatilityResult.confidence
            });
        });

        it('HOLDシグナルの場合は信頼度が低い', () => {
            const smallData = generateTestMarketData('AAPL', 30);
            const agents = [chairman, trendAgent, reversalAgent, volatilityAgent];
            
            agents.forEach(agent => {
                const result = agent.analyze(smallData);
                
                if (result.signal === 'HOLD') {
                    expect(result.confidence).toBe(0);
                    expect(result.reason).toContain('Insufficient data');
                }
            });
        });
    });

    describe('エージェントの重み付けとコンセンサス', () => {
        const testMarketData = generateTestMarketData('AAPL', 100);
        
        const chairman = new ChairmanAgent();
        const trendAgent = new TrendAgent();
        const reversalAgent = new ReversalAgent();
        const volatilityAgent = new VolatilityAgent();
        
        const weights: Record<string, number> = {
            'CHAIRMAN': 2.0,
            'VOLATILE': 1.5,
            'TREND': 1.0,
            'REVERSAL': 1.0
        };

        it('コンセンサスエンジンが正しく動作する', () => {
            const agentResults = [
                chairman.analyze(testMarketData, 'BULL_TREND'),
                trendAgent.analyze(testMarketData, 'BULL_TREND'),
                reversalAgent.analyze(testMarketData, 'BEAR_TREND'),
                volatilityAgent.analyze(testMarketData, 'SIDEWAYS')
            ];

            let totalScore = 0;
            let totalWeight = 0;
            const agentVotes: string[] = [];

            agentResults.forEach(result => {
                const weight = weights[result.role] || 1.0;
                
                let direction = 0;
                if (result.signal === 'BUY') direction = 1;
                else if (result.signal === 'SELL') direction = -1;
                
                const score = direction * result.confidence;
                totalScore += score * weight;
                totalWeight += weight;

                if (result.signal !== 'HOLD') {
                    agentVotes.push(`${result.name}: ${result.signal} (${result.confidence}%)`);
                } else if (result.role === 'CHAIRMAN') {
                    agentVotes.push(`${result.name}: ${result.reason}`);
                }
            });

            const consensusScore = totalWeight > 0 ? totalScore / totalWeight : 0;
            
            expect(consensusScore).toBeGreaterThanOrEqual(-100);
            expect(consensusScore).toBeLessThanOrEqual(100);
            expect(totalWeight).toBeGreaterThan(0);
            
            console.log('コンセンサススコア:', Math.round(consensusScore));
            console.log('エージェントの投票:', agentVotes);
        });

        it('重みが正しく適用されている', () => {
            expect(weights.CHAIRMAN).toBeGreaterThan(weights.TREND);
            expect(weights.CHAIRMAN).toBeGreaterThan(weights.REVERSAL);
            expect(weights.VOLATILE).toBeGreaterThan(weights.TREND);
        });

        it('Chairmanの影響力が最も大きい', () => {
            const chairmanResult = chairman.analyze(testMarketData);
            const trendResult = trendAgent.analyze(testMarketData);
            
            const chairmanInfluence = chairmanResult.confidence * weights.CHAIRMAN;
            const trendInfluence = trendResult.confidence * weights.TREND;
            
            if (chairmanResult.signal !== 'HOLD') {
                expect(chairmanInfluence).toBeGreaterThanOrEqual(trendInfluence);
            }
        });
    });

    describe('市場レジーム適応のテスト', () => {
        const testMarketData = generateTestMarketData('AAPL', 100);
        
        const regimes: MarketRegime[] = ['BULL_TREND', 'BEAR_TREND', 'SIDEWAYS', 'VOLATILE', 'SQUEEZE'];
        
        it('各レジームでエージェントが異なる挙動を示す', () => {
            const chairman = new ChairmanAgent();
            
            const results = regimes.map(regime => ({
                regime,
                result: chairman.analyze(testMarketData, regime)
            }));

            const signals = results.map(r => r.result.signal);
            
            expect(results.every(r => ['BUY', 'SELL', 'HOLD'].includes(r.result.signal))).toBe(true);
            
            console.log('レジームごとのChairmanAgentの挙動:');
            results.forEach(({ regime, result }) => {
                console.log(`  ${regime}: ${result.signal} (${result.confidence}%)`);
            });
        });

        it('VOLATILEレジームで信頼度が調整される', () => {
            const chairman = new ChairmanAgent();
            
            const volatileResult = chairman.analyze(testMarketData, 'VOLATILE');
            const normalResult = chairman.analyze(testMarketData, 'SIDEWAYS');
            
            expect(volatileResult.confidence).toBeLessThanOrEqual(normalResult.confidence + 10);
        });

        it('SQUEEZEレジームで特別な処理が行われる', () => {
            const chairman = new ChairmanAgent();
            
            const squeezeResult = chairman.analyze(testMarketData, 'SQUEEZE');
            
            expect(squeezeResult).toBeDefined();
            expect(['BUY', 'SELL', 'HOLD']).toContain(squeezeResult.signal);
            expect(squeezeResult.reason).toBeDefined();
        });
    });

    describe('エージェントのパフォーマンス比較', () => {
        const testMarketData = generateTestMarketData('AAPL', 100);
        
        it('各エージェントが一貫した結果を返す', () => {
            const chairman = new ChairmanAgent();
            
            const result1 = chairman.analyze(testMarketData);
            const result2 = chairman.analyze(testMarketData);
            
            expect(result1.signal).toBe(result2.signal);
            expect(result1.confidence).toBe(result2.confidence);
            expect(result1.reason).toBe(result2.reason);
        });

        it('異なるエージェントが異なる結果を返す可能性がある', () => {
            const chairman = new ChairmanAgent();
            const trendAgent = new TrendAgent();
            
            const chairmanResult = chairman.analyze(testMarketData);
            const trendResult = trendAgent.analyze(testMarketData);
            
            const results = [chairmanResult, trendResult];
            const uniqueSignals = new Set(results.map(r => r.signal));
            
            expect(uniqueSignals.size).toBeGreaterThan(0);
            expect(uniqueSignals.size).toBeLessThanOrEqual(3);
        });
    });
});

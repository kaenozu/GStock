import { describe, it, expect } from 'vitest';
import { ChairmanAgent } from '@/lib/agents/ChairmanAgent';
import { TrendAgent } from '@/lib/agents/TrendAgent';
import { ReversalAgent } from '@/lib/agents/ReversalAgent';
import { VolatilityAgent } from '@/lib/agents/VolatilityAgent';
import { StockDataPoint } from '@/types/market';

const generateTestData = (symbol: string, days: number): StockDataPoint[] => {
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

describe('AIエージェント基本機能', () => {
    const testMarketData = generateTestData('AAPL', 100);
    
    it('ChairmanAgentが予測を生成できる', () => {
        const agent = new ChairmanAgent();
        const prediction = agent.analyze(testMarketData);
        
        expect(prediction).toBeDefined();
        expect(['BUY', 'SELL', 'HOLD']).toContain(prediction.signal);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
        expect(prediction.name).toBe('Alpha (Chairman)');
        expect(prediction.role).toBe('CHAIRMAN');
    });

    it('TrendAgentがトレンドを検出できる', () => {
        const agent = new TrendAgent();
        const prediction = agent.analyze(testMarketData);
        
        expect(prediction).toBeDefined();
        expect(['BUY', 'SELL', 'HOLD']).toContain(prediction.signal);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
        expect(prediction.name).toBe('Trend Follower');
        expect(prediction.role).toBe('TREND');
    });

    it('ReversalAgentで逆張りを検出できる', () => {
        const agent = new ReversalAgent();
        const prediction = agent.analyze(testMarketData);
        
        expect(prediction).toBeDefined();
        expect(['BUY', 'SELL', 'HOLD']).toContain(prediction.signal);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
        expect(prediction.role).toBe('REVERSAL');
    });

    it('VolatilityAgentでボラティリティを検出できる', () => {
        const agent = new VolatilityAgent();
        const prediction = agent.analyze(testMarketData);
        
        expect(prediction).toBeDefined();
        expect(['BUY', 'SELL', 'HOLD']).toContain(prediction.signal);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(100);
        expect(prediction.role).toBe('VOLATILE');
    });

    it('データ不足時にHOLDを返す', () => {
        const smallData = generateTestData('AAPL', 30);
        const chairman = new ChairmanAgent();
        const trend = new TrendAgent();
        
        const chairmanResult = chairman.analyze(smallData);
        const trendResult = trend.analyze(smallData);
        
        expect(chairmanResult.signal).toBe('HOLD');
        expect(chairmanResult.confidence).toBe(0);
        expect(chairmanResult.reason).toContain('Insufficient data');
        
        expect(trendResult.signal).toBe('HOLD');
        expect(trendResult.confidence).toBe(0);
    });
});

describe('エージェントの連携テスト', () => {
    const testMarketData = generateTestData('AAPL', 100);
    
    const agents = [
        new ChairmanAgent(),
        new TrendAgent(),
        new ReversalAgent(),
        new VolatilityAgent()
    ];
    
    it('全エージェントの結果が一貫した形式を持つ', () => {
        const results = agents.map(agent => agent.analyze(testMarketData));
        
        results.forEach(result => {
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('role');
            expect(result).toHaveProperty('signal');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('reason');
            expect(result).toHaveProperty('sentiment');
            
            expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
            expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(result.sentiment);
        });
    });

    it('コンセンサススコアの計算が可能', () => {
        const results = agents.map(agent => agent.analyze(testMarketData));
        const weights: Record<string, number> = { CHAIRMAN: 2.0, TREND: 1.0, REVERSAL: 1.0, VOLATILE: 1.5 };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        results.forEach(result => {
            const weight = weights[result.role] || 1.0;
            let direction = 0;
            if (result.signal === 'BUY') direction = 1;
            else if (result.signal === 'SELL') direction = -1;
            
            const score = direction * result.confidence;
            totalScore += score * weight;
            totalWeight += weight;
        });
        
        const consensusScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        expect(consensusScore).toBeGreaterThanOrEqual(-100);
        expect(consensusScore).toBeLessThanOrEqual(100);
    });

    it('Chairmanの重みが他のエージェントより大きい', () => {
        const weights: Record<string, number> = { CHAIRMAN: 2.0, TREND: 1.0, REVERSAL: 1.0, VOLATILE: 1.5 };
        
        expect(weights.CHAIRMAN).toBeGreaterThan(weights.TREND);
        expect(weights.CHAIRMAN).toBeGreaterThan(weights.REVERSAL);
        expect(weights.CHAIRMAN).toBeGreaterThan(weights.VOLATILE);
    });
});

describe('エージェントの信頼度テスト', () => {
    const testMarketData = generateTestData('AAPL', 100);
    const agents = [
        { agent: new ChairmanAgent(), name: 'Chairman' },
        { agent: new TrendAgent(), name: 'Trend' },
        { agent: new ReversalAgent(), name: 'Reversal' },
        { agent: new VolatilityAgent(), name: 'Volatility' }
    ];
    
    it('各エージェントが有効な信頼度を返す', () => {
        agents.forEach(({ agent, name }) => {
            const result = agent.analyze(testMarketData);
            
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
            
            if (result.signal !== 'HOLD') {
                expect(result.confidence).toBeGreaterThan(0);
            }
        });
    });

    it('各エージェントが明確な理由を提供する', () => {
        agents.forEach(({ agent }) => {
            const result = agent.analyze(testMarketData);
            
            expect(result.reason).toBeDefined();
            expect(typeof result.reason).toBe('string');
            expect(result.reason.length).toBeGreaterThan(0);
        });
    });
});

describe('市場レジームテスト', () => {
    const testMarketData = generateTestData('AAPL', 100);
    const regimes = ['BULL_TREND', 'BEAR_TREND', 'SIDEWAYS', 'VOLATILE', 'SQUEEZE'] as const;
    
    it('各エージェントがレジームを考慮できる', () => {
        const chairman = new ChairmanAgent();
        const trend = new TrendAgent();
        
        regimes.forEach(regime => {
            const chairmanResult = chairman.analyze(testMarketData, regime);
            const trendResult = trend.analyze(testMarketData, regime);
            
            expect(['BUY', 'SELL', 'HOLD']).toContain(chairmanResult.signal);
            expect(['BUY', 'SELL', 'HOLD']).toContain(trendResult.signal);
            expect(chairmanResult.confidence).toBeGreaterThanOrEqual(0);
            expect(trendResult.confidence).toBeGreaterThanOrEqual(0);
        });
    });
});

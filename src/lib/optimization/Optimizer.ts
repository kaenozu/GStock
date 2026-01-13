import { StockDataPoint } from '@/types/market';
import { BacktestArena, BacktestReport } from '@/lib/backtest/BacktestArena';

export interface StrategyConfig {
    riskPercent: number;
    maxPosPercent: number;
    buyThreshold: number;
}

export interface OptimizationResult {
    config: StrategyConfig;
    report: BacktestReport;
    score: number;
}

export class StrategyOptimizer {
    private readonly RISK_LEVELS = [0.01, 0.02, 0.03, 0.05];
    private readonly THRESHOLD_LEVELS = [60, 65, 70, 75, 80];

    public runGridSearch(symbol: string, history: StockDataPoint[], initialBalance: number = 1000000): OptimizationResult[] {
        const results: OptimizationResult[] = [];
        const arena = new BacktestArena();

        for (const riskPercent of this.RISK_LEVELS) {
            for (const buyThreshold of this.THRESHOLD_LEVELS) {
                const config: StrategyConfig = {
                    riskPercent,
                    maxPosPercent: 0.2, // Fixed for now, could be optimized too
                    buyThreshold
                };

                const report = arena.run(symbol, history, initialBalance, config);
                const score = this.calculateScore(report);

                results.push({
                    config,
                    report,
                    score
                });
            }
        }

        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    private calculateScore(report: BacktestReport): number {
        // Score = ProfitFactor * WinRate * (1 - DrawdownPenalty)
        // DrawdownPenalty is exponential to severely punish high drawdowns
        if (report.tradeCount === 0) return 0;

        // Normalize Win Rate (0-1)
        const wr = report.winRate / 100;

        // Profit Factor (capped at 5 to prevent skewing)
        const pf = Math.min(report.profitFactor, 5);

        // Drawdown Penalty: 10% DD = 0.9 factor, 50% DD = 0.5 factor? 
        // Let's use (1 - MaxDrawdown) ^ 2 to punish deeply
        const safetyFactor = Math.pow(1 - report.maxDrawdown, 2);

        // Regularization: Prefer more trades to validate statistical significance
        const significance = Math.min(report.tradeCount / 10, 1); // Cap at 10 trades

        return pf * wr * safetyFactor * significance;
    }
}

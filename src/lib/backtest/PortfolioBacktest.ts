import { StockDataPoint } from '@/types/market';

export interface PortfolioAssetConfig {
    symbol: string;
    weight: number; // 0-100
}

export interface PortfolioBacktestConfig {
    assets: PortfolioAssetConfig[];
    initialCapital: number;
    periodDays: number;
    commissionRate?: number; // e.g. 0.01 for 1%
}

export interface AssetResult {
    symbol: string;
    weight: number;
    initialValue: number;
    finalValue: number;
    returnPercent: number;
    dailyReturns: number[];
}

export interface PortfolioBacktestResult {
    initialCapital: number;
    finalValue: number;
    totalReturnPercent: number;
    annualizedReturn: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
    portfolioHistory: { time: string; value: number }[];
    assetResults: AssetResult[];
    totalCommission: number;
    periodDays: number;
}

export const PORTFOLIO_TEMPLATES: Record<string, PortfolioAssetConfig[]> = {
    '60/40 Portfolio': [
        { symbol: 'SPY', weight: 60 },
        { symbol: 'AGG', weight: 40 },
    ],
    'All Weather': [
        { symbol: 'SPY', weight: 30 },
        { symbol: 'TLT', weight: 40 },
        { symbol: 'IEF', weight: 15 },
        { symbol: 'GLD', weight: 7.5 },
        { symbol: 'DBC', weight: 7.5 },
    ],
    'Tech Growth': [
        { symbol: 'QQQ', weight: 40 },
        { symbol: 'NVDA', weight: 20 },
        { symbol: 'AAPL', weight: 20 },
        { symbol: 'MSFT', weight: 20 },
    ],
    'Dividend Aristocrats': [
        { symbol: 'NOBL', weight: 100 },
    ]
};

export function runPortfolioBacktest(
    config: PortfolioBacktestConfig,
    dataMap: Record<string, StockDataPoint[]>
): PortfolioBacktestResult {
    // 1. Validation
    const totalWeight = config.assets.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error('Weight sum must be 100%');
    }

    const commissionRate = config.commissionRate || 0;
    const initialCapital = config.initialCapital;
    let totalCommission = 0;

    // 2. Align Data (Find common dates)
    const allSymbols = config.assets.map(a => a.symbol);
    const symbolData: Record<string, StockDataPoint[]> = {};

    let commonDates: Set<string> | null = null;

    for (const sym of allSymbols) {
        const rawData = dataMap[sym];
        if (!rawData || rawData.length === 0) {
            throw new Error('Insufficient common dates for backtest');
        }
        // Filter by periodDays (approx)
        const relevantData = rawData.slice(-config.periodDays);
        if (relevantData.length === 0) {
            throw new Error('Insufficient common dates for backtest');
        }

        const dates = new Set(relevantData.map(d => d.time));
        if (commonDates === null) {
            commonDates = dates;
        } else {
            // Intersection
            const currentCommon: Set<string> = commonDates!;
            const intersection: string[] = Array.from(currentCommon).filter((x: string) => dates.has(x));
            commonDates = new Set(intersection);
        }
        symbolData[sym] = rawData;
    }

    if (!commonDates || commonDates.size === 0) {
        throw new Error('Insufficient common dates for backtest');
    }

    // Sort common dates
    const sortedDates = Array.from(commonDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // 3. Simulate Portfolio
    // Setup initial allocation

    // We treat this as a "Buy and Hold" rebalanced ?? Or just buy and drift?
    // "Simple Portfolio Backtest" usually assumes "Buy and Hold" or "Rebalance Monthly".
    // For simplicity, let's assume Buy and Hold (Drifting weights), consistent with typical simple tools.
    // Or if test expects simple return calculation:
    // "配分比率の合計が100%..." -> Implies initial allocation.

    const assetStates = config.assets.map(asset => {
        const startData = symbolData[asset.symbol].find(d => d.time === sortedDates[0]);
        if (!startData) throw new Error('Data error'); // Should not happen due to intersection logic

        const allocation = initialCapital * (asset.weight / 100);
        // Apply commission on entry
        const commission = allocation * commissionRate;
        totalCommission += commission;
        const netAllocation = allocation - commission;

        const quantity = netAllocation / startData.close;

        return {
            symbol: asset.symbol,
            weight: asset.weight,
            quantity,
            initialValue: allocation,
            currentValue: allocation, // approx
        };
    });

    const history: { time: string; value: number }[] = [];
    let peakValue = -Infinity;
    let maxDrawdown = 0;

    for (const date of sortedDates) {
        let dailyTotal = 0;

        assetStates.forEach(state => {
            const dayData = symbolData[state.symbol].find(d => d.time === date);
            if (dayData) {
                state.currentValue = state.quantity * dayData.close;
            }
            dailyTotal += state.currentValue;
        });

        // Track Drawdown
        if (dailyTotal > peakValue) peakValue = dailyTotal;
        const dd = (peakValue - dailyTotal) / peakValue;
        if (dd > maxDrawdown) maxDrawdown = dd;

        history.push({ time: date, value: dailyTotal });
    }

    const finalValue = history[history.length - 1].value;
    const profit = finalValue - initialCapital;
    const totalReturnPercent = Number(((profit / initialCapital) * 100).toFixed(2));

    // Asset specific results
    const assetResults: AssetResult[] = assetStates.map(state => {
        const finalAssetValue = state.currentValue;
        // Logic for individual return: (Final - Initial) / Initial
        // Initial was passed in config (allocation).
        // But initialValue in state tracks allocation including commission? 
        // Let's exclude commission from return calc base? No, return is on invested capital.
        const assetReturn = ((finalAssetValue - state.initialValue) / state.initialValue) * 100;

        return {
            symbol: state.symbol,
            weight: state.weight,
            initialValue: state.initialValue,
            finalValue: finalAssetValue,
            returnPercent: Number(assetReturn.toFixed(2)),
            dailyReturns: [] // TODO: calc if needed for volatility
        };
    });

    // Calculate metrics
    // Annualized Return
    // CAGR = (Final / Initial) ^ (1/years) - 1
    const years = sortedDates.length / 252; // Trade days
    const annualizedReturn = years > 0
        ? Number((((Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100)).toFixed(2))
        : 0;

    // Volatility (Stdev of daily returns * sqrt(252))
    const dailyReturns: number[] = [];
    for (let i = 1; i < history.length; i++) {
        const ret = (history[i].value - history[i - 1].value) / history[i - 1].value;
        dailyReturns.push(ret);
    }
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / dailyReturns.length;
    const dailyVol = Math.sqrt(variance);
    const annualVol = Number((dailyVol * Math.sqrt(252) * 100).toFixed(2));

    // Sharpe Ratio (Assume Risk Free Rate 2% = 0.02)
    // Sharpe = (Return - Rf) / Volatility
    // Using simple approximation
    const riskFreeRate = 0.02;
    // We need Annualized Return (decimal)
    const cagrDecimal = annualizedReturn / 100;
    const volDecimal = annualVol / 100;

    // If vol is 0, sharpe appears infinite
    const sharpeRatio = volDecimal !== 0
        ? Number(((cagrDecimal - riskFreeRate) / volDecimal).toFixed(2))
        : 0;

    return {
        initialCapital,
        finalValue,
        totalReturnPercent,
        annualizedReturn,
        sharpeRatio,
        volatility: annualVol,
        maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
        portfolioHistory: history,
        assetResults,
        totalCommission,
        periodDays: sortedDates.length,
    };
}

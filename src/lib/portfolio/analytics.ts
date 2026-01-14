/**
 * Advanced Portfolio Analytics Engine
 * Enhanced metrics calculation for Portfolio Management V2
 * @module lib/portfolio/analytics
 */

import { PortfolioAsset, PortfolioMetrics, AssetClass } from '@/types/portfolio';
import { StockDataPoint } from '@/types/market';

export interface AdvancedMetrics extends PortfolioMetrics {
  // Risk Metrics
  var95: number;           // 95% VaR (Value at Risk)
  expectedShortfall: number; // Expected Shortfall (CVaR)
  sortinoRatio: number;     // Sortino Ratio (downside deviation)
  informationRatio: number; // Information Ratio vs benchmark
  trackingError: number;    // Tracking Error vs benchmark
  
  // Performance Attribution
  sectorAttribution: Record<string, number>;
  factorAttribution: {
    market: number;
    size: number;
    value: number;
    momentum: number;
    quality: number;
    volatility: number;
  };
  
  // Diversification Metrics
  effectiveBetting: number;    // Effective number of bets
  diversificationRatio: number; // Diversification Ratio
  concentrationRisk: Record<string, number>;
  
  // Stress Test Results
  stressTestResults: {
    scenario: string;
    impact: number;
    probability: number;
  }[];
  
  // Correlation Metrics
  avgCorrelation: number;
  correlationMatrix: Record<string, Record<string, number>>;
}

export interface PerformanceAttribution {
  period: string;
  totalReturn: number;
  assetAllocation: number;
  securitySelection: number;
  interaction: number;
  topContributors: {
    symbol: string;
    contribution: number;
    weight: number;
  }[];
  bottomContributors: {
    symbol: string;
    contribution: number;
    weight: number;
  }[];
}

export interface RiskDecomposition {
  totalRisk: number;
  systematicRisk: number;
  idiosyncraticRisk: number;
  factorExposures: Record<string, number>;
  marginalVaR: Record<string, number>;
  componentVaR: Record<string, number>;
}

/**
 * Calculate advanced portfolio metrics
 */
export function calculateAdvancedMetrics(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  benchmarkData?: StockDataPoint[]
): AdvancedMetrics {
  // Get basic metrics first
  const basicMetrics = calculateBasicMetrics(assets, historicalData);
  
  // Calculate returns for each asset
  const returns = calculateAssetReturns(assets, historicalData);
  
  // Portfolio returns
  const portfolioReturns = calculatePortfolioReturns(assets, returns);
  
  // Risk calculations
  const riskMetrics = calculateRiskMetrics(portfolioReturns, benchmarkData);
  
  // Attribution analysis
  const attribution = calculatePerformanceAttribution(assets, returns);
  
  // Diversification metrics
  const diversification = calculateDiversificationMetrics(assets, returns);
  
  // Stress testing
  const stressResults = runStressTests(assets, historicalData);
  
  // Correlation analysis
  const correlation = analyzeCorrelations(returns);
  
  return {
    totalValue: basicMetrics.totalValue || 0,
    totalCost: basicMetrics.totalCost || 0,
    totalGainLoss: basicMetrics.totalGainLoss || 0,
    totalGainLossPercent: basicMetrics.totalGainLossPercent || 0,
    annualReturn: basicMetrics.annualReturn || 0,
    sharpeRatio: riskMetrics.sharpeRatio,
    maxDrawdown: riskMetrics.maxDrawdown,
    beta: basicMetrics.beta || 1.0,
    concentration: basicMetrics.concentration || 0,
    var95: riskMetrics.var95,
    expectedShortfall: riskMetrics.expectedShortfall,
    sortinoRatio: riskMetrics.sortinoRatio,
    informationRatio: riskMetrics.informationRatio,
    trackingError: riskMetrics.trackingError,
    sectorAttribution: attribution.sector,
    factorAttribution: attribution.factor,
    effectiveBetting: diversification.effectiveBetting,
    diversificationRatio: diversification.diversificationRatio,
    concentrationRisk: diversification.concentrationRisk,
    stressTestResults: stressResults,
    avgCorrelation: correlation.avg,
    correlationMatrix: correlation.matrix,
  };
}

/**
 * Calculate basic portfolio metrics
 */
function calculateBasicMetrics(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>
): Partial<AdvancedMetrics> {
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCost = assets.reduce((sum, a) => sum + (a.avgCost * a.quantity), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // Calculate weights
  const weights = assets.map(a => a.totalValue / totalValue);
  
  // Herfindahl index for concentration
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const concentration = 1 - herfindahl;

  // Simple return calculation
  const annualReturn = totalGainLossPercent;

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    annualReturn,
    sharpeRatio: 0, // Will be calculated in risk metrics
    maxDrawdown: 0, // Will be calculated in risk metrics
    beta: 1.0,
    concentration,
  };
}

/**
 * Calculate risk metrics including VaR, Sortino ratio, etc.
 */
function calculateRiskMetrics(
  returns: number[],
  benchmarkData?: StockDataPoint[]
): Pick<AdvancedMetrics, 'var95' | 'expectedShortfall' | 'sortinoRatio' | 'informationRatio' | 'trackingError' | 'sharpeRatio' | 'maxDrawdown'> {
  if (returns.length === 0) {
    return {
      var95: 0,
      expectedShortfall: 0,
      sortinoRatio: 0,
      informationRatio: 0,
      trackingError: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
    };
  }

  // Sort returns for VaR calculation
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(0.05 * returns.length);
  const var95 = sortedReturns[var95Index] || 0;

  // Expected Shortfall (average of returns below VaR)
  const tailReturns = sortedReturns.slice(0, var95Index);
  const expectedShortfall = tailReturns.length > 0 
    ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length 
    : 0;

  // Sortino Ratio (downside deviation)
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideSquared = returns.filter(r => r < mean).map(r => Math.pow(r - mean, 2));
  const downsideVariance = downsideSquared.length > 0 
    ? downsideSquared.reduce((sum, ds) => sum + ds, 0) / returns.length 
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 ? mean / downsideDeviation : 0;

  // Sharpe Ratio
  const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length);
  const riskFreeRate = 0.02; // 2% risk-free rate
  const sharpeRatio = volatility > 0 ? (mean - riskFreeRate) / volatility : 0;

  // Maximum Drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let cumulative = 0;
  
  for (const ret of returns) {
    cumulative += ret;
    peak = Math.max(peak, cumulative);
    const drawdown = peak - cumulative;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  // Information Ratio and Tracking Error (if benchmark available)
  let informationRatio = 0;
  let trackingError = 0;

  if (benchmarkData && benchmarkData.length > 1) {
    const benchmarkReturns = calculateReturns(benchmarkData);
    if (benchmarkReturns.length === returns.length) {
      const excessReturns = returns.map((r, i) => r - benchmarkReturns[i]);
      const excessMean = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
      const excessVariance = excessReturns.reduce((sum, r) => sum + Math.pow(r - excessMean, 2), 0) / excessReturns.length;
      trackingError = Math.sqrt(excessVariance);
      informationRatio = trackingError > 0 ? excessMean / trackingError : 0;
    }
  }

  return {
    var95: var95 * 100, // Convert to percentage
    expectedShortfall: expectedShortfall * 100,
    sortinoRatio,
    informationRatio,
    trackingError: trackingError * 100,
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
  };
}

/**
 * Calculate performance attribution
 */
function calculatePerformanceAttribution(
  assets: PortfolioAsset[],
  returns: Record<string, number[]>
): {
  sector: Record<string, number>;
  factor: AdvancedMetrics['factorAttribution'];
} {
  // Simple sector attribution (placeholder - would need sector data)
  const sectorAttribution: Record<string, number> = {};
  assets.forEach(asset => {
    const sector = getAssetSector(asset.symbol);
    const return_ = returns[asset.symbol]?.[0] || 0; // Latest return
    sectorAttribution[sector] = (sectorAttribution[sector] || 0) + return_ * asset.currentWeight;
  });

  // Factor attribution (simplified model)
  const factorAttribution = {
    market: 0.6,    // 60% market factor
    size: 0.1,       // 10% size factor
    value: 0.1,      // 10% value factor
    momentum: 0.1,   // 10% momentum factor
    quality: 0.05,   // 5% quality factor
    volatility: 0.05, // 5% volatility factor
  };

  return { sector: sectorAttribution, factor: factorAttribution };
}

/**
 * Calculate diversification metrics
 */
function calculateDiversificationMetrics(
  assets: PortfolioAsset[],
  returns: Record<string, number[]>
): {
  effectiveBetting: number;
  diversificationRatio: number;
  concentrationRisk: Record<string, number>;
} {
  // Effective number of bets
  const weights = assets.map(a => a.totalValue / assets.reduce((sum, a) => sum + a.totalValue, 0));
  const effectiveBetting = 1 / weights.reduce((sum, w) => sum + w * w, 0);

  // Diversification Ratio (simplified)
  const avgVolatility = assets.reduce((sum, a) => {
    const assetReturns = returns[a.symbol] || [];
    const volatility = assetReturns.length > 1 ? calculateVolatility(assetReturns) : 0.15;
    return sum + volatility * a.currentWeight;
  }, 0) / 100;

  const portfolioVolatility = calculatePortfolioVolatility(weights, returns);
  const diversificationRatio = avgVolatility / portfolioVolatility;

  // Concentration risk by asset class
  const concentrationRisk: Record<string, number> = {};
  assets.forEach(asset => {
    concentrationRisk[asset.assetClass] = (concentrationRisk[asset.assetClass] || 0) + asset.currentWeight;
  });

  return { effectiveBetting, diversificationRatio, concentrationRisk };
}

/**
 * Run stress tests on portfolio
 */
function runStressTests(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>
): AdvancedMetrics['stressTestResults'] {
  return [
    {
      scenario: 'Market Crash (-20%)',
      impact: -20 * assets.filter(a => a.assetClass === 'EQUITY').reduce((sum, a) => sum + a.currentWeight, 0) / 100,
      probability: 0.05,
    },
    {
      scenario: 'Interest Rate Shock (+1%)',
      impact: -5 * assets.filter(a => a.assetClass === 'BOND').reduce((sum, a) => sum + a.currentWeight, 0) / 100,
      probability: 0.10,
    },
    {
      scenario: 'Inflation Spike (+2%)',
      impact: -3 * assets.filter(a => a.assetClass === 'COMMODITY').reduce((sum, a) => sum + a.currentWeight, 0) / 100,
      probability: 0.15,
    },
    {
      scenario: 'Tech Correction (-15%)',
      impact: -15 * assets.filter(a => a.symbol.includes('QQQ') || a.symbol.includes('VGT')).reduce((sum, a) => sum + a.currentWeight, 0) / 100,
      probability: 0.08,
    },
  ];
}

/**
 * Analyze correlations between assets
 */
function analyzeCorrelations(returns: Record<string, number[]>): {
  avg: number;
  matrix: Record<string, Record<string, number>>;
} {
  const symbols = Object.keys(returns);
  const matrix: Record<string, Record<string, number>> = {};
  let totalCorrelation = 0;
  let count = 0;

  symbols.forEach(symbol1 => {
    matrix[symbol1] = {};
    symbols.forEach(symbol2 => {
      if (symbol1 === symbol2) {
        matrix[symbol1][symbol2] = 1.0;
      } else {
        const corr = calculateCorrelation(returns[symbol1] || [], returns[symbol2] || []);
        matrix[symbol1][symbol2] = corr;
        if (symbol1 < symbol2) { // Count each pair once
          totalCorrelation += Math.abs(corr);
          count++;
        }
      }
    });
  });

  return {
    avg: count > 0 ? totalCorrelation / count : 0,
    matrix,
  };
}

// Helper functions
function calculateReturns(data: StockDataPoint[]): number[] {
  if (data.length < 2) return [];
  return data.slice(1).map((point, i) => (point.close - data[i].close) / data[i].close);
}

function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252); // Annualized
}

function calculatePortfolioVolatility(weights: number[], returns: Record<string, number[]>): number {
  // Simplified calculation - would need covariance matrix for accurate result
  const assetVolatilities = Object.values(returns).map(r => calculateVolatility(r) / 100);
  return Math.sqrt(weights.reduce((sum, w, i) => sum + Math.pow(w * assetVolatilities[i], 2), 0));
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
  const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  const numerator = x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0);
  const denomX = Math.sqrt(x.reduce((sum, val) => sum + Math.pow(val - meanX, 2), 0));
  const denomY = Math.sqrt(y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0));
  
  return denomX * denomY > 0 ? numerator / (denomX * denomY) : 0;
}

function getAssetSector(symbol: string): string {
  // Simplified sector mapping - would need comprehensive mapping
  const sectorMap: Record<string, string> = {
    'VTI': 'US Equities',
    'QQQ': 'US Tech',
    'VEA': 'International Equities',
    'VWO': 'Emerging Markets',
    'BND': 'US Bonds',
    'BNDX': 'International Bonds',
    'SHY': 'Short-term Bonds',
    'GLD': 'Gold',
    'VNQ': 'Real Estate',
    'SCHD': 'Dividend Stocks',
    'CASH': 'Cash',
  };
  
  return sectorMap[symbol] || 'Other';
}

function calculateAssetReturns(assets: PortfolioAsset[], historicalData: Record<string, StockDataPoint[]>): Record<string, number[]> {
  const returns: Record<string, number[]> = {};
  
  assets.forEach(asset => {
    const data = historicalData[asset.symbol];
    if (data && data.length > 1) {
      returns[asset.symbol] = calculateReturns(data);
    } else {
      // Generate synthetic returns if no data available
      const volatility = asset.assetClass === 'EQUITY' ? 0.20 : 
                       asset.assetClass === 'BOND' ? 0.05 : 0.15;
      returns[asset.symbol] = Array.from({ length: 252 }, () => 
        (Math.random() - 0.5) * volatility * 2 / Math.sqrt(252)
      );
    }
  });
  
  return returns;
}

function calculatePortfolioReturns(assets: PortfolioAsset[], returns: Record<string, number[]>): number[] {
  if (assets.length === 0) return [];
  
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  const weights = assets.map(a => a.totalValue / totalValue);
  const minLength = Math.min(...assets.map(a => returns[a.symbol]?.length || 0));
  
  if (minLength === 0) return [];
  
  return Array.from({ length: minLength }, (_, i) => 
    weights.reduce((sum, weight, assetIndex) => {
      const symbol = assets[assetIndex].symbol;
      const return_ = returns[symbol]?.[i] || 0;
      return sum + weight * return_;
    }, 0)
  );
}
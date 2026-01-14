/**
 * Portfolio Optimization Algorithms
 * Mean-Variance, Risk Parity, Maximum Diversification optimization
 * @module lib/portfolio/optimization
 */

import { PortfolioAsset, AssetClass } from '@/types/portfolio';
import { StockDataPoint } from '@/types/market';

export interface OptimizationResult {
  weights: Record<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationRatio: number;
  constraints: {
    minWeight: number;
    maxWeight: number;
    sectorLimits: Record<AssetClass, number>;
  };
  iterations: number;
  convergence: boolean;
}

export interface OptimizationConstraints {
  minWeight?: number;
  maxWeight?: number;
  sectorLimits?: Record<AssetClass, number>;
  riskTolerance?: number;
  targetReturn?: number;
  targetRisk?: number;
  riskFreeRate?: number;
}

/**
 * Mean-Variance Optimization (Markowitz)
 */
export function meanVarianceOptimization(
  assets: PortfolioAsset[],
  returns: Record<string, number[]>,
  constraints: OptimizationConstraints = {}
): OptimizationResult {
  const {
    minWeight = 0,
    maxWeight = 1,
    riskTolerance = 1.0,
    riskFreeRate = 0.02
  } = constraints;

  const symbols = assets.map(a => a.symbol);
  const n = symbols.length;
  
  // Calculate expected returns and covariance matrix
  const expectedReturns = calculateExpectedReturns(returns);
  const covarianceMatrix = calculateCovarianceMatrix(returns);
  
  // Use gradient descent for optimization
  let weights = Array(n).fill(1 / n); // Start with equal weights
  let bestWeights = [...weights];
  let bestSharpe = -Infinity;
  
  const learningRate = 0.01;
  const maxIterations = 1000;
  const tolerance = 1e-6;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate portfolio metrics
    const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
    const portfolioRisk = Math.sqrt(
      weights.reduce((sum, w, i) => 
        weights.reduce((innerSum, w2, j) => 
          innerSum + w * w2 * covarianceMatrix[i][j], 0
        ), 0
      )
    );
    
    const sharpe = portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0;
    
    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = [...weights];
    }
    
    // Calculate gradient
    const gradient = calculateGradient(weights, expectedReturns, covarianceMatrix, riskTolerance);
    
    // Update weights
    const newWeights = weights.map((w, i) => {
      let newW = w + learningRate * gradient[i];
      return Math.max(minWeight, Math.min(maxWeight, newW));
    });
    
    // Normalize weights to sum to 1
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => w / sum);
    
    // Check convergence
    const change = Math.max(...weights.map((w, i) => Math.abs(w - bestWeights[i])));
    if (change < tolerance) {
      break;
    }
  }
  
  const finalWeights: Record<string, number> = {};
  symbols.forEach((symbol, i) => {
    finalWeights[symbol] = weights[i];
  });
  
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  const portfolioRisk = Math.sqrt(
    weights.reduce((sum, w, i) => 
      weights.reduce((innerSum, w2, j) => 
        innerSum + w * w2 * covarianceMatrix[i][j], 0
      ), 0
    )
  );
  
  return {
    weights: finalWeights,
    expectedReturn: portfolioReturn,
    expectedRisk: portfolioRisk,
    sharpeRatio: bestSharpe,
    diversificationRatio: calculateDiversificationRatio(weights, covarianceMatrix),
    constraints: {
      minWeight,
      maxWeight,
      sectorLimits: constraints.sectorLimits || {
        EQUITY: 1.0,
        BOND: 1.0,
        COMMODITY: 1.0,
        CASH: 1.0,
        REAL_ESTATE: 1.0,
        CRYPTO: 1.0,
      },
    },
    iterations: maxIterations,
    convergence: true,
  };
}

/**
 * Risk Parity Optimization
 */
export function riskParityOptimization(
  assets: PortfolioAsset[],
  returns: Record<string, number[]>,
  constraints: OptimizationConstraints = {}
): OptimizationResult {
  const {
    minWeight = 0.01,
    maxWeight = 0.4,
    riskFreeRate = 0.02
  } = constraints;

  const symbols = assets.map(a => a.symbol);
  const n = symbols.length;
  
  // Calculate covariance matrix
  const covarianceMatrix = calculateCovarianceMatrix(returns);
  
  // Initialize weights
  let weights = Array(n).fill(1 / n);
  
  // Iterative algorithm to achieve risk parity
  const maxIterations = 1000;
  const tolerance = 1e-6;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate marginal contributions to risk
    const portfolioRisk = Math.sqrt(
      weights.reduce((sum, w, i) => 
        weights.reduce((innerSum, w2, j) => 
          innerSum + w * w2 * covarianceMatrix[i][j], 0
        ), 0
      )
    );
    
    const marginalRisks = weights.map((w, i) => 
      weights.reduce((sum, w2, j) => w2 * covarianceMatrix[i][j], 0) / portfolioRisk
    );
    
    const riskContributions = weights.map((w, i) => w * marginalRisks[i]);
    const targetRiskContribution = riskContributions.reduce((sum, rc) => sum + rc, 0) / n;
    
    // Update weights
    const newWeights = weights.map((w, i) => {
      const adjustment = Math.sqrt(targetRiskContribution / riskContributions[i]);
      let newW = w * adjustment;
      return Math.max(minWeight, Math.min(maxWeight, newW));
    });
    
    // Normalize weights
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => w / sum);
    
    // Check convergence
    const maxDeviation = Math.max(...riskContributions.map((rc, i) => 
      Math.abs(rc - targetRiskContribution) / targetRiskContribution
    ));
    
    if (maxDeviation < tolerance) {
      break;
    }
  }
  
  const finalWeights: Record<string, number> = {};
  symbols.forEach((symbol, i) => {
    finalWeights[symbol] = weights[i];
  });
  
  // Calculate expected returns and final metrics
  const expectedReturns = calculateExpectedReturns(returns);
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  const portfolioRisk = Math.sqrt(
    weights.reduce((sum, w, i) => 
      weights.reduce((innerSum, w2, j) => 
        innerSum + w * w2 * covarianceMatrix[i][j], 0
      ), 0
    )
  );
  
  return {
    weights: finalWeights,
    expectedReturn: portfolioReturn,
    expectedRisk: portfolioRisk,
    sharpeRatio: portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0,
    diversificationRatio: calculateDiversificationRatio(weights, covarianceMatrix),
    constraints: {
      minWeight,
      maxWeight,
      sectorLimits: constraints.sectorLimits || {
        EQUITY: 1.0,
        BOND: 1.0,
        COMMODITY: 1.0,
        CASH: 1.0,
        REAL_ESTATE: 1.0,
        CRYPTO: 1.0,
      },
    },
    iterations: maxIterations,
    convergence: true,
  };
}

/**
 * Maximum Diversification Optimization
 */
export function maximumDiversificationOptimization(
  assets: PortfolioAsset[],
  returns: Record<string, number[]>,
  constraints: OptimizationConstraints = {}
): OptimizationResult {
  const {
    minWeight = 0,
    maxWeight = 1,
    riskFreeRate = 0.02
  } = constraints;

  const symbols = assets.map(a => a.symbol);
  const n = symbols.length;
  
  // Calculate volatilities and correlation matrix
  const volatilities = symbols.map(symbol => {
    const assetReturns = returns[symbol] || [];
    return calculateVolatility(assetReturns);
  });
  
  const correlationMatrix = calculateCorrelationMatrix(returns);
  const covarianceMatrix = calculateCovarianceMatrix(returns);
  
  // Use numerical optimization to maximize diversification ratio
  let weights = Array(n).fill(1 / n);
  let bestWeights = [...weights];
  let bestDiversificationRatio = calculateDiversificationRatio(weights, covarianceMatrix);
  
  // Simple grid search + local optimization
  const gridSize = 20;
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (n === 2) {
        const w1 = i / gridSize;
        const w2 = j / gridSize;
        const sum = w1 + w2;
        if (Math.abs(sum - 1) < 0.1) {
          const testWeights = [w1 / sum, w2 / sum];
          const dr = calculateDiversificationRatio(testWeights, covarianceMatrix);
          if (dr > bestDiversificationRatio) {
            bestDiversificationRatio = dr;
            bestWeights = [...testWeights];
          }
        }
      } else {
        // For more assets, use random search
        const randomWeights = generateRandomWeights(n, minWeight, maxWeight);
        const dr = calculateDiversificationRatio(randomWeights, covarianceMatrix);
        if (dr > bestDiversificationRatio) {
          bestDiversificationRatio = dr;
          bestWeights = [...randomWeights];
        }
      }
    }
  }
  
  // Local optimization around best solution
  weights = [...bestWeights];
  const learningRate = 0.01;
  const maxIterations = 500;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const currentDR = calculateDiversificationRatio(weights, covarianceMatrix);
    
    // Gradient approximation
    const gradient = weights.map((w, i) => {
      const testWeights = [...weights];
      testWeights[i] += 0.001;
      
      // Normalize
      const sum = testWeights.reduce((a, b) => a + b, 0);
      testWeights.forEach((_, idx) => { testWeights[idx] /= sum; });
      
      const testDR = calculateDiversificationRatio(testWeights, covarianceMatrix);
      return (testDR - currentDR) / 0.001;
    });
    
    // Update weights
    const newWeights = weights.map((w, i) => {
      let newW = w + learningRate * gradient[i];
      return Math.max(minWeight, Math.min(maxWeight, newW));
    });
    
    // Normalize
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => w / sum);
    
    // Check convergence
    const newDR = calculateDiversificationRatio(weights, covarianceMatrix);
    if (Math.abs(newDR - currentDR) < 1e-8) {
      break;
    }
  }
  
  const finalWeights: Record<string, number> = {};
  symbols.forEach((symbol, i) => {
    finalWeights[symbol] = weights[i];
  });
  
  const expectedReturns = calculateExpectedReturns(returns);
  const portfolioReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  const portfolioRisk = Math.sqrt(
    weights.reduce((sum, w, i) => 
      weights.reduce((innerSum, w2, j) => 
        innerSum + w * w2 * covarianceMatrix[i][j], 0
      ), 0
    )
  );
  
  return {
    weights: finalWeights,
    expectedReturn: portfolioReturn,
    expectedRisk: portfolioRisk,
    sharpeRatio: portfolioRisk > 0 ? (portfolioReturn - riskFreeRate) / portfolioRisk : 0,
    diversificationRatio: bestDiversificationRatio,
    constraints: {
      minWeight,
      maxWeight,
      sectorLimits: constraints.sectorLimits || {
        EQUITY: 1.0,
        BOND: 1.0,
        COMMODITY: 1.0,
        CASH: 1.0,
        REAL_ESTATE: 1.0,
        CRYPTO: 1.0,
      },
    },
    iterations: maxIterations,
    convergence: true,
  };
}

/**
 * Generate efficient frontier
 */
export function generateEfficientFrontier(
  assets: PortfolioAsset[],
  returns: Record<string, number[]>,
  numPortfolios: number = 100
): { return: number; risk: number; sharpe: number; weights: Record<string, number> }[] {
  const frontier = [];
  const minReturn = Math.min(...calculateExpectedReturns(returns));
  const maxReturn = Math.max(...calculateExpectedReturns(returns));
  
  for (let i = 0; i <= numPortfolios; i++) {
    const targetReturn = minReturn + (maxReturn - minReturn) * (i / numPortfolios);
    
    try {
      const result = meanVarianceOptimization(assets, returns, { targetReturn });
      
      frontier.push({
        return: result.expectedReturn,
        risk: result.expectedRisk,
        sharpe: result.sharpeRatio,
        weights: result.weights,
      });
    } catch (error) {
      // Skip invalid portfolios
    }
  }
  
  // Sort by risk
  return frontier.sort((a, b) => a.risk - b.risk);
}

// Helper functions
function calculateExpectedReturns(returns: Record<string, number[]>): number[] {
  return Object.values(returns).map(assetReturns => {
    if (assetReturns.length === 0) return 0;
    return assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length * 252; // Annualized
  });
}

function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252); // Annualized
}

function calculateCovarianceMatrix(returns: Record<string, number[]>): number[][] {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const cov = calculateCovariance(returns[symbols[i]], returns[symbols[j]]);
      matrix[i][j] = cov;
      matrix[j][i] = cov;
    }
  }
  
  return matrix;
}

function calculateCorrelationMatrix(returns: Record<string, number[]>): number[][] {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      const corr = calculateCorrelation(returns[symbols[i]], returns[symbols[j]]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }
  
  return matrix;
}

function calculateCovariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
  const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  const covariance = x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0) / x.length;
  
  return covariance;
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

function calculateGradient(
  weights: number[],
  expectedReturns: number[],
  covarianceMatrix: number[][],
  riskTolerance: number
): number[] {
  const n = weights.length;
  const gradient: number[] = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    gradient[i] = expectedReturns[i] - riskTolerance * weights.reduce((sum, w, j) => 
      w * (covarianceMatrix[i][j] + covarianceMatrix[j][i]) / 2, 0
    );
  }
  
  return gradient;
}

function calculateDiversificationRatio(weights: number[], covarianceMatrix: number[][]): number {
  const n = weights.length;
  
  // Weighted average volatility
  let weightedVolSum = 0;
  for (let i = 0; i < n; i++) {
    const volatility = Math.sqrt(covarianceMatrix[i][i]);
    weightedVolSum += weights[i] * volatility;
  }
  
  // Portfolio volatility
  const portfolioVolatility = Math.sqrt(
    weights.reduce((sum, w, i) => 
      weights.reduce((innerSum, w2, j) => 
        innerSum + w * w2 * covarianceMatrix[i][j], 0
      ), 0
    )
  );
  
  return portfolioVolatility > 0 ? weightedVolSum / portfolioVolatility : 1;
}

function generateRandomWeights(n: number, minWeight: number, maxWeight: number): number[] {
  const weights = Array(n).fill(0).map(() => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  
  return weights.map(w => {
    const normalized = w / sum;
    return Math.max(minWeight, Math.min(maxWeight, normalized));
  });
}
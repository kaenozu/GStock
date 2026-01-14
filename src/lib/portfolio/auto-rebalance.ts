/**
 * Automated Rebalancing with Tax-Loss Harvesting
 * Smart rebalancing with tax optimization
 * @module lib/portfolio/auto-rebalance
 */

import { PortfolioAsset, RebalanceAction, RebalanceSettings } from '@/types/portfolio';
import { StockDataPoint } from '@/types/market';

export interface TaxLossHarvestingRule {
  symbol: string;
  thresholdLoss: number;    // Loss threshold percentage
  washSalePeriod: number;   // Days to avoid wash sale (30 days)
  replacementETF: string;    // ETF to buy instead
  priority: number;         // Priority for harvesting (1-10)
}

export interface RebalanceStrategy {
  name: string;
  description: string;
  minThreshold: number;
  maxThreshold: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  enableTLH: boolean;
  enableTaxOptimization: boolean;
}

export interface RebalanceRecommendation {
  actions: RebalanceAction[];
  taxLossHarvesting: TaxLossHarvestingAction[];
  estimatedSavings: {
    taxSavings: number;
    transactionCosts: number;
    netSavings: number;
  };
  riskMetrics: {
    beforeRebalance: number;
    afterRebalance: number;
    riskReduction: number;
  };
  timing: {
    optimal: Date;
    deadline: Date;
    marketCondition: string;
  };
}

export interface TaxLossHarvestingAction {
  symbol: string;
  action: 'SELL_LOSS';
  quantity: number;
  lossAmount: number;
  taxSavings: number;
  replacementSymbol: string;
  replacementQuantity: number;
  washSaleEndDate: Date;
}

export interface TaxLot {
  symbol: string;
  quantity: number;
  costBasis: number;
  purchaseDate: Date;
  currentValue: number;
  unrealizedGainLoss: number;
  gainLossPercent: number;
  holdingPeriod: 'SHORT' | 'LONG';
}

/**
 * Automated rebalancing with tax-loss harvesting
 */
export function automatedRebalance(
  assets: PortfolioAsset[],
  targetWeights: Record<string, number>,
  settings: RebalanceSettings,
  taxLots: TaxLot[],
  currentPrices: Record<string, number>,
  strategy: RebalanceStrategy,
  marketData?: Record<string, StockDataPoint[]>
): RebalanceRecommendation {
  
  // Standard rebalancing actions
  const standardActions = calculateStandardRebalancing(assets, targetWeights, settings, currentPrices);
  
  // Tax-loss harvesting actions
  const taxLossActions = strategy.enableTLH 
    ? calculateTaxLossHarvesting(taxLots, currentPrices, getTLHRules())
    : [];
  
  // Merge and optimize actions
  const optimizedActions = optimizeRebalancingActions(
    standardActions, 
    taxLossActions, 
    strategy.enableTaxOptimization
  );
  
  // Calculate savings
  const estimatedSavings = calculateEstimatedSavings(
    optimizedActions.standard,
    optimizedActions.taxLoss,
    taxLots
  );
  
  // Risk metrics
  const riskMetrics = calculateRiskImpact(assets, optimizedActions, targetWeights);
  
  // Timing analysis
  const timing = calculateOptimalTiming(optimizedActions, marketData, strategy);
  
  return {
    actions: optimizedActions.standard,
    taxLossHarvesting: optimizedActions.taxLoss,
    estimatedSavings,
    riskMetrics,
    timing,
  };
}

/**
 * Calculate standard rebalancing actions
 */
function calculateStandardRebalancing(
  assets: PortfolioAsset[],
  targetWeights: Record<string, number>,
  settings: RebalanceSettings,
  currentPrices: Record<string, number>
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  for (const asset of assets) {
    const currentWeight = (asset.totalValue / totalValue) * 100;
    const targetWeight = targetWeights[asset.symbol] || 0;
    const deviation = currentWeight - targetWeight;
    
    if (Math.abs(deviation) < settings.threshold) continue;
    if (asset.symbol === 'CASH') continue;
    
    const targetValue = (targetWeight / 100) * totalValue;
    const difference = targetValue - asset.totalValue;
    
    if (Math.abs(difference) < settings.minTradeAmount) continue;
    
    const quantity = Math.floor(Math.abs(difference) / currentPrices[asset.symbol]);
    if (quantity === 0) continue;
    
    const estimatedCost = quantity * currentPrices[asset.symbol] * 0.001; // 0.1% commission
    
    actions.push({
      symbol: asset.symbol,
      action: difference > 0 ? 'BUY' : 'SELL',
      quantity,
      currentWeight: Math.round(currentWeight * 100) / 100,
      targetWeight: Math.round(targetWeight * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    });
  }
  
  // Sort SELL actions first, then by deviation
  return actions.sort((a, b) => {
    if (a.action === 'SELL' && b.action === 'BUY') return -1;
    if (a.action === 'BUY' && b.action === 'SELL') return 1;
    return Math.abs(b.deviation) - Math.abs(a.deviation);
  });
}

/**
 * Calculate tax-loss harvesting opportunities
 */
function calculateTaxLossHarvesting(
  taxLots: TaxLot[],
  currentPrices: Record<string, number>,
  rules: TaxLossHarvestingRule[]
): TaxLossHarvestingAction[] {
  const actions: TaxLossHarvestingAction[] = [];
  const now = new Date();
  
  taxLots.forEach(lot => {
    const currentValue = currentPrices[lot.symbol] * lot.quantity;
    const unrealizedLoss = currentValue - lot.costBasis;
    const lossPercent = (unrealizedLoss / lot.costBasis) * 100;
    
    if (unrealizedLoss >= 0) return; // Only loss positions
    
    const rule = rules.find(r => r.symbol === lot.symbol);
    if (!rule || lossPercent > -rule.thresholdLoss) return;
    
    const taxSavings = calculateTaxSavings(unrealizedLoss, lot.holdingPeriod);
    const washSaleEndDate = new Date(now.getTime() + rule.washSalePeriod * 24 * 60 * 60 * 1000);
    
    actions.push({
      symbol: lot.symbol,
      action: 'SELL_LOSS',
      quantity: lot.quantity,
      lossAmount: Math.abs(unrealizedLoss),
      taxSavings,
      replacementSymbol: rule.replacementETF,
      replacementQuantity: lot.quantity,
      washSaleEndDate,
    });
  });
  
  // Sort by tax savings and priority
  return actions.sort((a, b) => {
    const aRule = rules.find(r => r.symbol === a.symbol);
    const bRule = rules.find(r => r.symbol === b.symbol);
    const aPriority = aRule?.priority || 5;
    const bPriority = bRule?.priority || 5;
    
    // First sort by priority (lower number = higher priority)
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then by tax savings
    return b.taxSavings - a.taxSavings;
  });
}

/**
 * Optimize rebalancing actions
 */
function optimizeRebalancingActions(
  standardActions: RebalanceAction[],
  taxLossActions: TaxLossHarvestingAction[],
  enableTaxOptimization: boolean
): { standard: RebalanceAction[]; taxLoss: TaxLossHarvestingAction[] } {
  if (!enableTaxOptimization) {
    return { standard: standardActions, taxLoss: taxLossActions };
  }
  
  // Find conflicts between standard SELL and tax-loss harvesting
  const optimizedStandard = [...standardActions];
  const optimizedTaxLoss = [...taxLossActions];
  
  // Remove standard SELL actions that conflict with tax-loss harvesting
  taxLossActions.forEach(tlhAction => {
    const conflictingIndex = optimizedStandard.findIndex(
      action => action.symbol === tlhAction.symbol && action.action === 'SELL'
    );
    
    if (conflictingIndex >= 0) {
      // Merge the actions - prioritize tax-loss harvesting
      const standardAction = optimizedStandard[conflictingIndex];
      
      // Add replacement BUY action
      optimizedStandard.push({
        symbol: tlhAction.replacementSymbol,
        action: 'BUY',
        quantity: tlhAction.replacementQuantity,
        currentWeight: 0, // Will be calculated
        targetWeight: 0, // Will be calculated
        deviation: 0,
        estimatedCost: tlhAction.replacementQuantity * 
          (tlhAction.lossAmount / tlhAction.quantity) * 0.001,
      });
      
      // Remove the conflicting SELL action
      optimizedStandard.splice(conflictingIndex, 1);
    }
  });
  
  return { standard: optimizedStandard, taxLoss: optimizedTaxLoss };
}

/**
 * Calculate estimated savings
 */
function calculateEstimatedSavings(
  standardActions: RebalanceAction[],
  taxLossActions: TaxLossHarvestingAction[],
  taxLots: TaxLot[]
): RebalanceRecommendation['estimatedSavings'] {
  
  // Transaction costs for standard rebalancing
  const transactionCosts = standardActions.reduce(
    (sum, action) => sum + action.estimatedCost, 0
  );
  
  // Tax savings from harvesting
  const taxSavings = taxLossActions.reduce(
    (sum, action) => sum + action.taxSavings, 0
  );
  
  // Additional transaction costs for tax-loss harvesting
  const tlhTransactionCosts = taxLossActions.reduce((sum, action) => {
    const sellCost = action.lossAmount * 0.001;
    const buyCost = action.replacementQuantity * 
      (action.lossAmount / action.quantity) * 0.001;
    return sum + sellCost + buyCost;
  }, 0);
  
  const totalTransactionCosts = transactionCosts + tlhTransactionCosts;
  const netSavings = taxSavings - totalTransactionCosts;
  
  return {
    taxSavings,
    transactionCosts: totalTransactionCosts,
    netSavings,
  };
}

/**
 * Calculate risk impact
 */
function calculateRiskImpact(
  assets: PortfolioAsset[],
  optimizedActions: { standard: RebalanceAction[]; taxLoss: TaxLossHarvestingAction[] },
  targetWeights: Record<string, number>
): RebalanceRecommendation['riskMetrics'] {
  
  // Simplified risk calculation (would use proper portfolio risk model)
  const currentRisk = calculatePortfolioRisk(assets);
  
  // Apply standard rebalancing
  const rebalancedAssets = applyRebalancingActions(assets, optimizedActions.standard);
  const afterStandardRisk = calculatePortfolioRisk(rebalancedAssets);
  
  // Apply tax-loss harvesting
  const afterTLHRisk = calculatePortfolioRisk(rebalancedAssets);
  
  const afterRebalance = afterStandardRisk; // Simplified
  const riskReduction = currentRisk - afterRebalance;
  
  return {
    beforeRebalance: currentRisk,
    afterRebalance,
    riskReduction,
  };
}

/**
 * Calculate optimal timing
 */
function calculateOptimalTiming(
  optimizedActions: { standard: RebalanceAction[]; taxLoss: TaxLossHarvestingAction[] },
  marketData?: Record<string, StockDataPoint[]>,
  strategy?: RebalanceStrategy
): RebalanceRecommendation['timing'] {
  
  const now = new Date();
  const optimal = new Date(now);
  const deadline = new Date(now);
  
  // Set deadline based on strategy frequency
  switch (strategy?.frequency) {
    case 'DAILY':
      deadline.setDate(deadline.getDate() + 1);
      break;
    case 'WEEKLY':
      deadline.setDate(deadline.getDate() + 7);
      break;
    case 'MONTHLY':
      deadline.setMonth(deadline.getMonth() + 1);
      break;
    case 'QUARTERLY':
      deadline.setMonth(deadline.getMonth() + 3);
      break;
  }
  
  // Determine market condition
  const marketCondition = analyzeMarketCondition(marketData);
  
  // Find optimal execution time (avoid high volatility periods)
  if (marketCondition === 'VOLATILE') {
    optimal.setHours(10, 0, 0, 0); // Market open
  } else if (marketCondition === 'LOW_VOLUME') {
    optimal.setHours(15, 30, 0, 0); // Before close
  } else {
    optimal.setHours(14, 0, 0, 0); // Mid-day
  }
  
  return {
    optimal,
    deadline,
    marketCondition,
  };
}

/**
 * Execute automated rebalancing
 */
export function executeAutomatedRebalance(
  recommendation: RebalanceRecommendation,
  brokerage: string
): Promise<{ success: boolean; results: any; errors: string[] }> {
  
  return new Promise((resolve) => {
    // This would integrate with actual brokerage API
    const results: any[] = [];
    const errors: string[] = [];
    
    // Execute tax-loss harvesting first
    recommendation.taxLossHarvesting.forEach(async (action) => {
      try {
        const result = await executeTaxLossHarvestingAction(action, brokerage);
        results.push(result);
      } catch (error) {
        errors.push(`TLH ${action.symbol}: ${error}`);
      }
    });
    
    // Then execute standard rebalancing
    recommendation.actions.forEach(async (action) => {
      try {
        const result = await executeRebalanceAction(action, brokerage);
        results.push(result);
      } catch (error) {
        errors.push(`Rebalance ${action.symbol}: ${error}`);
      }
    });
    
    setTimeout(() => {
      resolve({
        success: errors.length === 0,
        results,
        errors,
      });
    }, 1000); // Simulate async execution
  });
}

// Helper functions
function calculateTaxSavings(loss: number, holdingPeriod: 'SHORT' | 'LONG'): number {
  const shortTermRate = 0.35; // 35% for short-term gains
  const longTermRate = 0.15;  // 15% for long-term gains
  
  const rate = holdingPeriod === 'SHORT' ? shortTermRate : longTermRate;
  return Math.abs(loss) * rate;
}

function getTLHRules(): TaxLossHarvestingRule[] {
  return [
    {
      symbol: 'VTI',
      thresholdLoss: 5,
      washSalePeriod: 30,
      replacementETF: 'VOO',
      priority: 1,
    },
    {
      symbol: 'QQQ',
      thresholdLoss: 5,
      washSalePeriod: 30,
      replacementETF: 'IVV',
      priority: 2,
    },
    {
      symbol: 'BND',
      thresholdLoss: 3,
      washSalePeriod: 30,
      replacementETF: 'AGG',
      priority: 3,
    },
    {
      symbol: 'VWO',
      thresholdLoss: 8,
      washSalePeriod: 30,
      replacementETF: 'IEMG',
      priority: 4,
    },
    {
      symbol: 'VNQ',
      thresholdLoss: 6,
      washSalePeriod: 30,
      replacementETF: 'VNQI',
      priority: 5,
    },
  ];
}

function calculatePortfolioRisk(assets: PortfolioAsset[]): number {
  // Simplified risk calculation based on asset class weights
  const classRisk: Record<string, number> = {
    'EQUITY': 0.15,
    'BOND': 0.05,
    'COMMODITY': 0.20,
    'CASH': 0.01,
    'REAL_ESTATE': 0.12,
    'CRYPTO': 0.60,
  };
  
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  const weightedRisk = assets.reduce((sum, asset) => {
    const weight = asset.totalValue / totalValue;
    const risk = classRisk[asset.assetClass] || 0.10;
    return sum + weight * risk;
  }, 0);
  
  return weightedRisk * 100; // Return as percentage
}

function applyRebalancingActions(
  assets: PortfolioAsset[],
  actions: RebalanceAction[]
): PortfolioAsset[] {
  const updatedAssets = [...assets];
  
  actions.forEach(action => {
    const assetIndex = updatedAssets.findIndex(a => a.symbol === action.symbol);
    if (assetIndex >= 0) {
      const asset = updatedAssets[assetIndex];
      const priceChange = action.action === 'BUY' 
        ? action.quantity * (asset.totalValue / asset.quantity)
        : -action.quantity * (asset.totalValue / asset.quantity);
      
      updatedAssets[assetIndex] = {
        ...asset,
        quantity: action.action === 'BUY' 
          ? asset.quantity + action.quantity
          : Math.max(0, asset.quantity - action.quantity),
        totalValue: asset.totalValue + priceChange,
      };
    }
  });
  
  return updatedAssets;
}

function analyzeMarketCondition(marketData?: Record<string, StockDataPoint[]>): string {
  if (!marketData || Object.keys(marketData).length === 0) {
    return 'NORMAL';
  }
  
  // Analyze recent market data to determine condition
  const spyData = marketData['SPY'] || Object.values(marketData)[0];
  if (!spyData || spyData.length < 10) {
    return 'NORMAL';
  }
  
  const recent = spyData.slice(-10);
  const volatility = calculateMarketVolatility(recent);
  const volume = calculateRelativeVolume(recent);
  
  if (volatility > 0.03) return 'VOLATILE';
  if (volume < 0.5) return 'LOW_VOLUME';
  return 'NORMAL';
}

function calculateMarketVolatility(data: StockDataPoint[]): number {
  if (data.length < 2) return 0;
  
  const returns = data.slice(1).map((point, i) => 
    (point.close - data[i].close) / data[i].close
  );
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

function calculateRelativeVolume(data: StockDataPoint[]): number {
  if (data.length < 5) return 1;
  
  const recentVolume = data.slice(-5).reduce((sum, d) => sum + (d.close || 0), 0) / 5;
  const historicalVolume = data.slice(5, -5).reduce((sum, d) => sum + (d.close || 0), 0) / Math.max(1, data.length - 10);
  
  return historicalVolume > 0 ? recentVolume / historicalVolume : 1;
}

async function executeTaxLossHarvestingAction(
  action: TaxLossHarvestingAction,
  brokerage: string
): Promise<any> {
  // Placeholder for actual brokerage integration
  return {
    symbol: action.symbol,
    action: action.action,
    quantity: action.quantity,
    status: 'EXECUTED',
    timestamp: new Date().toISOString(),
  };
}

async function executeRebalanceAction(
  action: RebalanceAction,
  brokerage: string
): Promise<any> {
  // Placeholder for actual brokerage integration
  return {
    symbol: action.symbol,
    action: action.action,
    quantity: action.quantity,
    cost: action.estimatedCost,
    status: 'EXECUTED',
    timestamp: new Date().toISOString(),
  };
}
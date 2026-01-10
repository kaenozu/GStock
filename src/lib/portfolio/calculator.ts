/**
 * Portfolio Calculator
 * Metrics calculation, rebalancing logic
 */

import {
  PortfolioAsset,
  PortfolioMetrics,
  RebalanceAction,
  RebalanceSettings,
} from '@/types/portfolio';

// Calculate portfolio metrics
export function calculateMetrics(assets: PortfolioAsset[]): PortfolioMetrics {
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCost = assets.reduce((sum, a) => sum + (a.avgCost * a.quantity), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // Calculate concentration (Herfindahl Index inverse)
  const weights = assets.map(a => a.currentWeight / 100);
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const concentration = 1 - herfindahl; // Higher = more diversified

  // Placeholder values for complex metrics (would need historical data)
  const annualReturn = totalGainLossPercent; // Simplified
  const sharpeRatio = annualReturn > 0 ? annualReturn / 15 : 0; // Assuming 15% vol
  const maxDrawdown = -10; // Placeholder
  const beta = 1.0; // Placeholder

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
    annualReturn,
    sharpeRatio,
    maxDrawdown,
    beta,
    concentration,
  };
}

// Update current weights based on values
export function updateWeights(assets: PortfolioAsset[]): PortfolioAsset[] {
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  return assets.map(asset => ({
    ...asset,
    currentWeight: totalValue > 0 ? (asset.totalValue / totalValue) * 100 : 0,
  }));
}

// Calculate rebalance actions
export function calculateRebalanceActions(
  assets: PortfolioAsset[],
  settings: RebalanceSettings
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);

  for (const asset of assets) {
    const deviation = asset.currentWeight - asset.targetWeight;
    const absDeviation = Math.abs(deviation);

    // Skip if deviation is below threshold
    if (absDeviation < settings.threshold) continue;

    // Skip CASH asset
    if (asset.symbol === 'CASH') continue;

    const targetValue = (asset.targetWeight / 100) * totalValue;
    const currentValue = asset.totalValue;
    const difference = targetValue - currentValue;

    // Skip if trade amount is below minimum
    if (Math.abs(difference) < settings.minTradeAmount) continue;

    const quantity = Math.floor(Math.abs(difference) / asset.currentPrice);
    if (quantity === 0) continue;

    actions.push({
      symbol: asset.symbol,
      action: difference > 0 ? 'BUY' : 'SELL',
      quantity,
      currentWeight: asset.currentWeight,
      targetWeight: asset.targetWeight,
      deviation,
      estimatedCost: quantity * asset.currentPrice,
    });
  }

  // Sort: SELL first, then BUY (to free up cash)
  return actions.sort((a, b) => {
    if (a.action === 'SELL' && b.action === 'BUY') return -1;
    if (a.action === 'BUY' && b.action === 'SELL') return 1;
    return Math.abs(b.deviation) - Math.abs(a.deviation);
  });
}

// Check if rebalance is needed
export function needsRebalance(
  assets: PortfolioAsset[],
  threshold: number
): boolean {
  return assets.some(asset => 
    Math.abs(asset.currentWeight - asset.targetWeight) >= threshold
  );
}

// Format currency
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

// Format percent
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

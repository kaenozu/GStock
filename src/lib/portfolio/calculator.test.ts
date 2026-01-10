import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  updateWeights,
  calculateRebalanceActions,
  needsRebalance,
  formatCurrency,
  formatPercent,
} from './calculator';
import { PortfolioAsset, RebalanceSettings } from '@/types/portfolio';

describe('Portfolio Calculator', () => {
  const mockAssets: PortfolioAsset[] = [
    {
      symbol: 'VTI',
      name: 'US Total Stock',
      assetClass: 'EQUITY',
      targetWeight: 60,
      currentWeight: 50,
      quantity: 10,
      currentPrice: 200,
      avgCost: 180,
      totalValue: 2000,
      gainLoss: 200,
      gainLossPercent: 11.11,
    },
    {
      symbol: 'BND',
      name: 'US Bonds',
      assetClass: 'BOND',
      targetWeight: 30,
      currentWeight: 35,
      quantity: 20,
      currentPrice: 70,
      avgCost: 72,
      totalValue: 1400,
      gainLoss: -40,
      gainLossPercent: -2.78,
    },
    {
      symbol: 'CASH',
      name: 'Cash',
      assetClass: 'CASH',
      targetWeight: 10,
      currentWeight: 15,
      quantity: 600,
      currentPrice: 1,
      avgCost: 1,
      totalValue: 600,
      gainLoss: 0,
      gainLossPercent: 0,
    },
  ];

  const mockSettings: RebalanceSettings = {
    threshold: 5,
    minTradeAmount: 100,
    frequency: 'MONTHLY',
    lastRebalance: null,
  };

  describe('calculateMetrics', () => {
    it('should calculate total value correctly', () => {
      const metrics = calculateMetrics(mockAssets);
      expect(metrics.totalValue).toBe(4000);
    });

    it('should calculate total gain/loss correctly', () => {
      const metrics = calculateMetrics(mockAssets);
      expect(metrics.totalGainLoss).toBe(160); // 200 - 40 + 0
    });

    it('should calculate concentration (diversification)', () => {
      const metrics = calculateMetrics(mockAssets);
      // Herfindahl: 0.5^2 + 0.35^2 + 0.15^2 = 0.25 + 0.1225 + 0.0225 = 0.395
      // Concentration = 1 - 0.395 = 0.605
      expect(metrics.concentration).toBeCloseTo(0.605, 2);
    });
  });

  describe('updateWeights', () => {
    it('should update weights based on total value', () => {
      const updated = updateWeights(mockAssets);
      // VTI: 2000/4000 = 50%
      expect(updated[0].currentWeight).toBeCloseTo(50, 1);
      // BND: 1400/4000 = 35%
      expect(updated[1].currentWeight).toBeCloseTo(35, 1);
      // CASH: 600/4000 = 15%
      expect(updated[2].currentWeight).toBeCloseTo(15, 1);
    });
  });

  describe('calculateRebalanceActions', () => {
    it('should return actions when deviation exceeds threshold', () => {
      const actions = calculateRebalanceActions(mockAssets, mockSettings);
      // VTI: 50% -> 60% (deviation -10%, > 5% threshold) -> BUY
      expect(actions.some(a => a.symbol === 'VTI' && a.action === 'BUY')).toBe(true);
    });

    it('should skip CASH from rebalance actions', () => {
      const actions = calculateRebalanceActions(mockAssets, mockSettings);
      expect(actions.some(a => a.symbol === 'CASH')).toBe(false);
    });

    it('should return SELL before BUY', () => {
      const actions = calculateRebalanceActions(mockAssets, mockSettings);
      const sellIndex = actions.findIndex(a => a.action === 'SELL');
      const buyIndex = actions.findIndex(a => a.action === 'BUY');
      if (sellIndex >= 0 && buyIndex >= 0) {
        expect(sellIndex).toBeLessThan(buyIndex);
      }
    });
  });

  describe('needsRebalance', () => {
    it('should return true when deviation exceeds threshold', () => {
      expect(needsRebalance(mockAssets, 5)).toBe(true);
    });

    it('should return false when all within threshold', () => {
      const balancedAssets = mockAssets.map(a => ({
        ...a,
        currentWeight: a.targetWeight,
      }));
      expect(needsRebalance(balancedAssets, 5)).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });
  });

  describe('formatPercent', () => {
    it('should format positive percent with + sign', () => {
      expect(formatPercent(12.34)).toBe('+12.34%');
    });

    it('should format negative percent', () => {
      expect(formatPercent(-5.5)).toBe('-5.50%');
    });
  });
});

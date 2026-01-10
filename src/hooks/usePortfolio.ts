/**
 * usePortfolio Hook
 * Portfolio state management with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PortfolioProfile,
  PortfolioAsset,
  StrategyType,
  RebalanceAction,
} from '@/types/portfolio';
import { getStrategy } from '@/lib/portfolio/strategies';
import {
  calculateMetrics,
  updateWeights,
  calculateRebalanceActions,
  needsRebalance,
} from '@/lib/portfolio/calculator';

const STORAGE_KEY = 'gstock-portfolios';
const ACTIVE_KEY = 'gstock-active-profile';

// Generate unique ID
const generateId = () => `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const usePortfolio = () => {
  const [profiles, setProfiles] = useState<PortfolioProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedProfiles = localStorage.getItem(STORAGE_KEY);
      if (savedProfiles) {
        setProfiles(JSON.parse(savedProfiles));
      }

      const savedActiveId = localStorage.getItem(ACTIVE_KEY);
      if (savedActiveId) {
        setActiveProfileId(savedActiveId);
      }
    } catch (e) {
      console.error('Failed to load portfolios:', e);
      setError('Failed to load portfolios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    if (activeProfileId) {
      localStorage.setItem(ACTIVE_KEY, activeProfileId);
    }
  }, [activeProfileId, isLoading]);

  // Get active profile
  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  // Create new profile from strategy
  const createProfile = useCallback((strategyType: StrategyType, name?: string): PortfolioProfile => {
    const template = getStrategy(strategyType);
    const now = new Date().toISOString();
    const id = generateId();

    // Create assets from template allocations (with mock prices)
    const assets: PortfolioAsset[] = template.allocations.map(alloc => {
      const mockPrice = alloc.symbol === 'CASH' ? 1 : Math.random() * 200 + 50;
      const quantity = alloc.symbol === 'CASH' ? 10000 : Math.floor((10000 * alloc.weight / 100) / mockPrice);
      const totalValue = quantity * mockPrice;

      return {
        symbol: alloc.symbol,
        name: alloc.name,
        assetClass: alloc.assetClass,
        targetWeight: alloc.weight,
        currentWeight: alloc.weight,
        quantity,
        currentPrice: mockPrice,
        avgCost: mockPrice,
        totalValue,
        gainLoss: 0,
        gainLossPercent: 0,
      };
    });

    const updatedAssets = updateWeights(assets);

    const profile: PortfolioProfile = {
      id,
      name: name || template.name,
      description: template.description,
      strategy: strategyType,
      riskLevel: template.riskLevel,
      assets: updatedAssets,
      metrics: calculateMetrics(updatedAssets),
      rebalanceSettings: {
        threshold: 5,
        minTradeAmount: 100,
        frequency: 'MONTHLY',
        lastRebalance: null,
      },
      createdAt: now,
      updatedAt: now,
    };

    setProfiles(prev => [...prev, profile]);
    setActiveProfileId(id);

    return profile;
  }, []);

  // Delete profile
  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  }, [activeProfileId]);

  // Update asset prices (simulate or from API)
  const updatePrices = useCallback((priceUpdates: Record<string, number>) => {
    if (!activeProfile) return;

    const updatedAssets = activeProfile.assets.map(asset => {
      const newPrice = priceUpdates[asset.symbol] || asset.currentPrice;
      const totalValue = asset.quantity * newPrice;
      const gainLoss = totalValue - (asset.avgCost * asset.quantity);
      const gainLossPercent = asset.avgCost > 0 ? (gainLoss / (asset.avgCost * asset.quantity)) * 100 : 0;

      return {
        ...asset,
        currentPrice: newPrice,
        totalValue,
        gainLoss,
        gainLossPercent,
      };
    });

    const finalAssets = updateWeights(updatedAssets);

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeProfile.id) return p;
      return {
        ...p,
        assets: finalAssets,
        metrics: calculateMetrics(finalAssets),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [activeProfile]);

  // Get rebalance actions
  const getRebalanceActions = useCallback((): RebalanceAction[] => {
    if (!activeProfile) return [];
    return calculateRebalanceActions(
      activeProfile.assets,
      activeProfile.rebalanceSettings
    );
  }, [activeProfile]);

  // Check if rebalance needed
  const isRebalanceNeeded = useCallback((): boolean => {
    if (!activeProfile) return false;
    return needsRebalance(
      activeProfile.assets,
      activeProfile.rebalanceSettings.threshold
    );
  }, [activeProfile]);

  // Execute rebalance (simulation)
  const executeRebalance = useCallback(() => {
    if (!activeProfile) return;

    // In real implementation, this would call broker API
    // For now, we just reset weights to target
    const rebalancedAssets = activeProfile.assets.map(asset => ({
      ...asset,
      currentWeight: asset.targetWeight,
    }));

    setProfiles(prev => prev.map(p => {
      if (p.id !== activeProfile.id) return p;
      return {
        ...p,
        assets: rebalancedAssets,
        metrics: calculateMetrics(rebalancedAssets),
        rebalanceSettings: {
          ...p.rebalanceSettings,
          lastRebalance: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [activeProfile]);

  return {
    // State
    profiles,
    activeProfile,
    activeProfileId,
    isLoading,
    error,

    // Actions
    setActiveProfileId,
    createProfile,
    deleteProfile,
    updatePrices,
    getRebalanceActions,
    isRebalanceNeeded,
    executeRebalance,
  };
};

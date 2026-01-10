/**
 * Portfolio Strategy Templates
 * Pre-defined allocation strategies for different investor profiles
 */

import { StrategyTemplate, StrategyType } from '@/types/portfolio';

export const STRATEGY_TEMPLATES: Record<StrategyType, StrategyTemplate> = {
  AGGRESSIVE_GROWTH: {
    type: 'AGGRESSIVE_GROWTH',
    name: 'アグレッシブ成長',
    description: '高リターンを狙う株式中心のポートフォリオ。リスク許容度が高い投資家向け。',
    riskLevel: 'AGGRESSIVE',
    allocations: [
      { symbol: 'VTI', name: '米国全株式ETF', assetClass: 'EQUITY', weight: 50 },
      { symbol: 'QQQ', name: 'NASDAQ 100 ETF', assetClass: 'EQUITY', weight: 25 },
      { symbol: 'VWO', name: '新興国株式ETF', assetClass: 'EQUITY', weight: 15 },
      { symbol: 'GLD', name: '金ETF', assetClass: 'COMMODITY', weight: 5 },
      { symbol: 'CASH', name: '現金', assetClass: 'CASH', weight: 5 },
    ],
  },

  BALANCED_GROWTH: {
    type: 'BALANCED_GROWTH',
    name: 'バランス型成長',
    description: '株式と債券のバランス。安定成長を目指す。',
    riskLevel: 'MODERATE',
    allocations: [
      { symbol: 'VTI', name: '米国全株式ETF', assetClass: 'EQUITY', weight: 40 },
      { symbol: 'VEA', name: '先進国株式ETF', assetClass: 'EQUITY', weight: 15 },
      { symbol: 'BND', name: '米国総合債券ETF', assetClass: 'BOND', weight: 25 },
      { symbol: 'BNDX', name: '国際債券ETF', assetClass: 'BOND', weight: 10 },
      { symbol: 'VNQ', name: '不動産ETF', assetClass: 'REAL_ESTATE', weight: 5 },
      { symbol: 'CASH', name: '現金', assetClass: 'CASH', weight: 5 },
    ],
  },

  CONSERVATIVE_STABLE: {
    type: 'CONSERVATIVE_STABLE',
    name: '保守的安定',
    description: '債券中心の安定型。資産保全を重視。',
    riskLevel: 'CONSERVATIVE',
    allocations: [
      { symbol: 'VTI', name: '米国全株式ETF', assetClass: 'EQUITY', weight: 25 },
      { symbol: 'VEA', name: '先進国株式ETF', assetClass: 'EQUITY', weight: 10 },
      { symbol: 'BND', name: '米国総合債券ETF', assetClass: 'BOND', weight: 35 },
      { symbol: 'SHY', name: '短期国債ETF', assetClass: 'BOND', weight: 15 },
      { symbol: 'GLD', name: '金ETF', assetClass: 'COMMODITY', weight: 5 },
      { symbol: 'CASH', name: '現金', assetClass: 'CASH', weight: 10 },
    ],
  },

  AGE_BASED_YOUNG: {
    type: 'AGE_BASED_YOUNG',
    name: '20-30歳向け',
    description: '長期投資の利点を活かした成長重視型。',
    riskLevel: 'AGGRESSIVE',
    allocations: [
      { symbol: 'VTI', name: '米国全株式ETF', assetClass: 'EQUITY', weight: 55 },
      { symbol: 'VWO', name: '新興国株式ETF', assetClass: 'EQUITY', weight: 20 },
      { symbol: 'QQQ', name: 'NASDAQ 100 ETF', assetClass: 'EQUITY', weight: 15 },
      { symbol: 'BND', name: '米国総合債券ETF', assetClass: 'BOND', weight: 5 },
      { symbol: 'CASH', name: '現金', assetClass: 'CASH', weight: 5 },
    ],
  },

  AGE_BASED_MIDDLE: {
    type: 'AGE_BASED_MIDDLE',
    name: '30-50歳向け',
    description: '成長と安定のバランス。',
    riskLevel: 'MODERATE',
    allocations: [
      { symbol: 'VTI', name: '米国全株式ETF', assetClass: 'EQUITY', weight: 45 },
      { symbol: 'VEA', name: '先進国株式ETF', assetClass: 'EQUITY', weight: 10 },
      { symbol: 'BND', name: '米国総合債券ETF', assetClass: 'BOND', weight: 25 },
      { symbol: 'BNDX', name: '国際債券ETF', assetClass: 'BOND', weight: 10 },
      { symbol: 'VNQ', name: '不動産ETF', assetClass: 'REAL_ESTATE', weight: 5 },
      { symbol: 'CASH', name: '現金', assetClass: 'CASH', weight: 5 },
    ],
  },

  AGE_BASED_SENIOR: {
    type: 'AGE_BASED_SENIOR',
    name: '50歳以上向け',
    description: '資産保全と安定収入を重視。',
    riskLevel: 'CONSERVATIVE',
    allocations: [
      { symbol: 'VTI', name: '米国全株式ETF', assetClass: 'EQUITY', weight: 30 },
      { symbol: 'VEA', name: '先進国株式ETF', assetClass: 'EQUITY', weight: 5 },
      { symbol: 'BND', name: '米国総合債券ETF', assetClass: 'BOND', weight: 30 },
      { symbol: 'SHY', name: '短期国債ETF', assetClass: 'BOND', weight: 15 },
      { symbol: 'SCHD', name: '高配当ETF', assetClass: 'EQUITY', weight: 10 },
      { symbol: 'CASH', name: '現金', assetClass: 'CASH', weight: 10 },
    ],
  },

  CUSTOM: {
    type: 'CUSTOM',
    name: 'カスタム',
    description: '自分で配分を設定',
    riskLevel: 'MODERATE',
    allocations: [],
  },
};

// Get strategy by type
export const getStrategy = (type: StrategyType): StrategyTemplate => {
  return STRATEGY_TEMPLATES[type];
};

// Get all strategies as array
export const getAllStrategies = (): StrategyTemplate[] => {
  return Object.values(STRATEGY_TEMPLATES).filter(s => s.type !== 'CUSTOM');
};

// Risk level colors
export const RISK_COLORS: Record<string, string> = {
  AGGRESSIVE: '#ef4444',
  MODERATE: '#f59e0b',
  CONSERVATIVE: '#22c55e',
};

// Asset class colors for charts
export const ASSET_CLASS_COLORS: Record<string, string> = {
  EQUITY: '#3b82f6',
  BOND: '#22c55e',
  COMMODITY: '#f59e0b',
  CASH: '#6b7280',
  REAL_ESTATE: '#8b5cf6',
  CRYPTO: '#ec4899',
};

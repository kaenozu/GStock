/**
 * Portfolio Types - GStock Portfolio Management System
 * Designed by the Council of Ten Engineers
 */

// Asset Classes
export type AssetClass = 'EQUITY' | 'BOND' | 'COMMODITY' | 'CASH' | 'REAL_ESTATE' | 'CRYPTO';

// Risk Levels
export type RiskLevel = 'AGGRESSIVE' | 'MODERATE' | 'CONSERVATIVE';

// Portfolio Strategy Types
export type StrategyType = 
  | 'AGGRESSIVE_GROWTH'    // 株式90%
  | 'BALANCED_GROWTH'      // 株式60%・債券30%・現金10%
  | 'CONSERVATIVE_STABLE'  // 株式40%・債券50%・現金10%
  | 'AGE_BASED_YOUNG'      // 20-30歳向け
  | 'AGE_BASED_MIDDLE'     // 30-50歳向け
  | 'AGE_BASED_SENIOR'     // 50歳以上
  | 'CUSTOM';              // カスタム

// Individual Asset in Portfolio
export interface PortfolioAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  targetWeight: number;      // 目標配分比率 (0-100)
  currentWeight: number;     // 現在の配分比率
  quantity: number;          // 保有数量
  currentPrice: number;      // 現在価格
  avgCost: number;           // 平均取得コスト
  totalValue: number;        // 評価額
  gainLoss: number;          // 損益
  gainLossPercent: number;   // 損益率
}

// Portfolio Performance Metrics
export interface PortfolioMetrics {
  totalValue: number;           // 総評価額
  totalCost: number;            // 総取得コスト
  totalGainLoss: number;        // 総損益
  totalGainLossPercent: number; // 総損益率
  annualReturn: number;         // 年率リターン
  sharpeRatio: number;          // シャープレシオ
  maxDrawdown: number;          // 最大ドローダウン
  beta: number;                 // ポートフォリオベータ
  concentration: number;        // 集中度 (0-1, 低いほど分散)
}

// Rebalance Action
export interface RebalanceAction {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  currentWeight: number;
  targetWeight: number;
  deviation: number;          // 乖離率
  estimatedCost: number;      // 推定コスト
}

// Rebalance Settings
export interface RebalanceSettings {
  threshold: number;          // リバランス閾値 (例: 5%)
  minTradeAmount: number;     // 最小取引額
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL';
  lastRebalance: string | null;
}

// Portfolio Profile
export interface PortfolioProfile {
  id: string;
  name: string;
  description: string;
  strategy: StrategyType;
  riskLevel: RiskLevel;
  assets: PortfolioAsset[];
  metrics: PortfolioMetrics;
  rebalanceSettings: RebalanceSettings;
  createdAt: string;
  updatedAt: string;
}

// Preset Strategy Templates
export interface StrategyTemplate {
  type: StrategyType;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  allocations: {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    weight: number;
  }[];
}

// Portfolio State
export interface PortfolioState {
  profiles: PortfolioProfile[];
  activeProfileId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Rebalance History Entry
export interface RebalanceHistoryEntry {
  id: string;
  profileId: string;
  timestamp: string;
  actions: RebalanceAction[];
  totalTrades: number;
  success: boolean;
  message: string;
}

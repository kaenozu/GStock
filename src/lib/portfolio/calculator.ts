/**
 * Portfolio Calculator
 * @description ポートフォリオのメトリクス計算、リバランスロジック
 * @module lib/portfolio/calculator
 */

import {
  PortfolioAsset,
  PortfolioMetrics,
  RebalanceAction,
  RebalanceSettings,
} from '@/types/portfolio';

/** リスクフリーレート（日本国債想定、0.5%） */
const RISK_FREE_RATE = 0.005;

/**
 * ポートフォリオメトリクスを計算
 * @param assets - アセット一覧
 * @param historicalReturns - 過去のリターン（オプション、Sharpe計算用）
 * @returns ポートフォリオメトリクス
 */
export function calculateMetrics(
  assets: PortfolioAsset[],
  historicalReturns?: number[]
): PortfolioMetrics {
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  const totalCost = assets.reduce((sum, a) => sum + (a.avgCost * a.quantity), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // Herfindahl Indexによる集中度計算
  const weights = assets.map(a => a.currentWeight / 100);
  const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);
  const concentration = 1 - herfindahl;

  // 年率リターン（簡易計算）
  const annualReturn = totalGainLossPercent;

  // Sharpe Ratio計算（歴史データがある場合）
  let sharpeRatio = 0;
  let volatility = 15; // デフォルトボラティリティ

  if (historicalReturns && historicalReturns.length > 1) {
    // 標準偏差を計算
    const mean = historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length;
    const squaredDiffs = historicalReturns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / historicalReturns.length;
    volatility = Math.sqrt(variance) * Math.sqrt(252); // 年率化

    // Sharpe Ratio = (リターン - リスクフリーレート) / ボラティリティ
    if (volatility > 0) {
      sharpeRatio = (annualReturn / 100 - RISK_FREE_RATE) / (volatility / 100);
    }
  } else {
    // 単純な推定
    if (volatility > 0) {
      sharpeRatio = (annualReturn / 100 - RISK_FREE_RATE) / (volatility / 100);
    }
  }

  // プレースホルダー（将来の拡張用）
  const maxDrawdown = -10;
  const beta = 1.0;

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
    annualReturn: Math.round(annualReturn * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown,
    beta,
    concentration: Math.round(concentration * 1000) / 1000,
  };
}

/**
 * 現在のウェイトを更新
 * @param assets - アセット一覧
 * @returns ウェイト更新済みアセット一覧
 */
export function updateWeights(assets: PortfolioAsset[]): PortfolioAsset[] {
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  return assets.map(asset => ({
    ...asset,
    currentWeight: totalValue > 0 ? (asset.totalValue / totalValue) * 100 : 0,
  }));
}

/**
 * リバランスアクションを計算
 * @param assets - アセット一覧
 * @param settings - リバランス設定
 * @param commissionRate - 手数料率（デフォルト: 0.1%）
 * @returns リバランスアクション一覧
 */
export function calculateRebalanceActions(
  assets: PortfolioAsset[],
  settings: RebalanceSettings,
  commissionRate: number = 0.001
): RebalanceAction[] {
  const actions: RebalanceAction[] = [];
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);

  for (const asset of assets) {
    const deviation = asset.currentWeight - asset.targetWeight;
    const absDeviation = Math.abs(deviation);

    // 閾値以下はスキップ
    if (absDeviation < settings.threshold) continue;

    // CASHはスキップ
    if (asset.symbol === 'CASH') continue;

    const targetValue = (asset.targetWeight / 100) * totalValue;
    const currentValue = asset.totalValue;
    const difference = targetValue - currentValue;

    // 最小取引額以下はスキップ
    if (Math.abs(difference) < settings.minTradeAmount) continue;

    const quantity = Math.floor(Math.abs(difference) / asset.currentPrice);
    if (quantity === 0) continue;

    // 手数料を考慮したコスト計算
    const grossCost = quantity * asset.currentPrice;
    const commission = grossCost * commissionRate;
    const estimatedCost = grossCost + commission;

    actions.push({
      symbol: asset.symbol,
      action: difference > 0 ? 'BUY' : 'SELL',
      quantity,
      currentWeight: Math.round(asset.currentWeight * 100) / 100,
      targetWeight: asset.targetWeight,
      deviation: Math.round(deviation * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    });
  }

  // SELLを先にソート（現金を確保）
  return actions.sort((a, b) => {
    if (a.action === 'SELL' && b.action === 'BUY') return -1;
    if (a.action === 'BUY' && b.action === 'SELL') return 1;
    return Math.abs(b.deviation) - Math.abs(a.deviation);
  });
}

/**
 * リバランスが必要かチェック
 * @param assets - アセット一覧
 * @param threshold - 閾値（%）
 * @returns リバランスが必要かどうか
 */
export function needsRebalance(
  assets: PortfolioAsset[],
  threshold: number
): boolean {
  return assets.some(asset => 
    Math.abs(asset.currentWeight - asset.targetWeight) >= threshold
  );
}

/**
 * 通貨フォーマット
 * @param value - 金額
 * @param currency - 通貨コード（デフォルト: USD）
 * @returns フォーマット済み文字列
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * パーセントフォーマット
 * @param value - 値
 * @param decimals - 小数点以下の桁数
 * @returns フォーマット済み文字列
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

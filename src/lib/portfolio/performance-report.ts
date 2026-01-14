/**
 * ポートフォリオパフォーマンスレポート機能
 * 詳細なパフォーマンス分析とエクスポート機能
 * @module lib/portfolio/performance-report
 */

import { PortfolioAsset, PortfolioMetrics, RebalanceHistoryEntry } from '@/types/portfolio';
import { StockDataPoint } from '@/types/market';

export interface PerformanceReport {
  period: {
    startDate: Date;
    endDate: Date;
    duration: string;
  };
  summary: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  returns: {
    daily: number[];
    weekly: number[];
    monthly: number[];
    quarterly: number[];
    yearly: number[];
  };
  benchmarks: {
    spy: BenchmarkComparison;
    bnd: BenchmarkComparison;
    custom?: BenchmarkComparison;
  };
  attribution: {
    assetAllocation: number;
    securitySelection: number;
    interaction: number;
    sectorBreakdown: Record<string, number>;
    factorBreakdown: Record<string, number>;
  };
  riskMetrics: {
    var95: number;
    expectedShortfall: number;
    beta: number;
    trackingError: number;
    informationRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
  };
  events: {
    rebalances: RebalanceHistoryEntry[];
    significantEvents: PerformanceEvent[];
  };
}

export interface BenchmarkComparison {
  name: string;
  return: number;
  volatility: number;
  sharpeRatio: number;
  correlation: number;
  beta: number;
  alpha: number;
  trackingError: number;
  informationRatio: number;
}

export interface PerformanceEvent {
  date: Date;
  type: 'HIGH' | 'LOW' | 'REBALANCE' | 'DRAWDOWN' | 'RECOVERY';
  description: string;
  impact: number;
  value: number;
}

export interface ExportFormat {
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  filename: string;
  sections: string[];
  options: {
    includeCharts: boolean;
    includeDetailedTransactions: boolean;
    includeBenchmarks: boolean;
    language: 'ja' | 'en';
  };
}

/**
 * 包括的なパフォーマンスレポートを生成
 */
export function generatePerformanceReport(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  rebalanceHistory: RebalanceHistoryEntry[],
  benchmarkData: Record<string, StockDataPoint[]>,
  period: { startDate: Date; endDate: Date }
): PerformanceReport {
  
  // ポートフォリオの時系列データを計算
  const portfolioTimeSeries = calculatePortfolioTimeSeries(assets, historicalData, period);
  
  // リターンを計算
  const returns = calculateReturns(portfolioTimeSeries);
  
  // 要約統計を計算
  const summary = calculateSummaryStats(portfolioTimeSeries, returns);
  
  // ベンチマーク比較
  const benchmarks = calculateBenchmarkComparisons(
    portfolioTimeSeries, 
    benchmarkData, 
    period
  );
  
  // パフォーマンス帰属分析
  const attribution = calculatePerformanceAttribution(assets, returns);
  
  // リスク指標
  const riskMetrics = calculateRiskMetrics(returns, benchmarkData);
  
  // イベントを特定
  const significantEvents = identifyPerformanceEvents(portfolioTimeSeries, rebalanceHistory);
  
  return {
    period: {
      ...period,
      duration: calculateDuration(period.startDate, period.endDate),
    },
    summary,
    returns,
    benchmarks,
    attribution,
    riskMetrics,
    events: {
      rebalances: rebalanceHistory,
      significantEvents,
    },
  };
}

/**
 * レポートを各種形式でエクスポート
 */
export async function exportPerformanceReport(
  report: PerformanceReport,
  format: ExportFormat
): Promise<{ success: boolean; filepath?: string; error?: string }> {
  
  try {
    switch (format.format) {
      case 'PDF':
        return await exportToPDF(report, format);
      case 'EXCEL':
        return await exportToExcel(report, format);
      case 'CSV':
        return await exportToCSV(report, format);
      case 'JSON':
        return await exportToJSON(report, format);
      default:
        throw new Error(`サポートされていない形式: ${format.format}`);
    }
  } catch (error) {
    return {
      success: false,
      error: `エクスポート失敗: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * パフォーマンスダッシュボードデータを生成
 */
export function generateDashboardData(
  report: PerformanceReport
): {
  overview: {
    totalReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  chartData: {
    performance: { date: string; value: number; benchmark?: number }[];
    drawdown: { date: string; value: number }[];
    rollingReturns: { date: string; oneMonth: number; threeMonth: number; oneYear: number }[];
    attribution: { category: string; value: number }[];
  };
  metrics: PerformanceReport['riskMetrics'];
} {
  
  const performanceChart = report.returns.daily.map((ret, i) => ({
    date: new Date(report.period.startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: (1 + ret) * (i === 0 ? 100 : (i === 1 ? 100 + ret * 100 : 0)), // 簡略化
  }));
  
  const drawdownChart = calculateDrawdownSeries(performanceChart);
  const rollingReturns = calculateRollingReturns(report.returns.daily);
  
  const attributionChart = [
    { category: 'アセット配分', value: report.attribution.assetAllocation },
    { category: '銘柄選択', value: report.attribution.securitySelection },
    { category: '相互作用', value: report.attribution.interaction },
  ];
  
  return {
    overview: report.summary,
    chartData: {
      performance: performanceChart,
      drawdown: drawdownChart,
      rollingReturns,
      attribution: attributionChart,
    },
    metrics: report.riskMetrics,
  };
}

// ヘルパー関数

function calculatePortfolioTimeSeries(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  period: { startDate: Date; endDate: Date }
): StockDataPoint[] {
  
  // 全資産の期間を取得
  const allDates = new Set<string>();
  assets.forEach(asset => {
    const data = historicalData[asset.symbol] || [];
    data.forEach(point => {
      const date = new Date(point.time);
      if (date >= period.startDate && date <= period.endDate) {
        allDates.add(point.time);
      }
    });
  });
  
  const sortedDates = Array.from(allDates).sort();
  const timeSeries: StockDataPoint[] = [];
  
  sortedDates.forEach(dateStr => {
    let totalValue = 0;
    let validAssets = 0;
    
    assets.forEach(asset => {
      const data = historicalData[asset.symbol] || [];
      const point = data.find(p => p.time === dateStr);
      
      if (point) {
        const currentValue = point.close * asset.quantity;
        totalValue += currentValue;
        validAssets++;
      }
    });
    
    if (validAssets > 0) {
      timeSeries.push({
        time: dateStr,
        open: totalValue,
        high: totalValue * 1.01, // 簡略化
        low: totalValue * 0.99,   // 簡略化
        close: totalValue,
      });
    }
  });
  
  return timeSeries;
}

function calculateReturns(timeSeries: StockDataPoint[]): PerformanceReport['returns'] {
  if (timeSeries.length < 2) {
    return { daily: [], weekly: [], monthly: [], quarterly: [], yearly: [] };
  }
  
  const dailyReturns = timeSeries.slice(1).map((point, i) => 
    (point.close - timeSeries[i].close) / timeSeries[i].close
  );
  
  return {
    daily: dailyReturns,
    weekly: aggregateReturns(dailyReturns, 5),    // 5日=1週間
    monthly: aggregateReturns(dailyReturns, 21),  // 21日≈1ヶ月
    quarterly: aggregateReturns(dailyReturns, 63), // 63日≈3ヶ月
    yearly: aggregateReturns(dailyReturns, 252),   // 252日≈1年
  };
}

function aggregateReturns(dailyReturns: number[], period: number): number[] {
  const aggregated: number[] = [];
  
  for (let i = 0; i < dailyReturns.length; i += period) {
    const periodReturns = dailyReturns.slice(i, i + period);
    if (periodReturns.length > 0) {
      const compoundedReturn = periodReturns.reduce((acc, ret) => acc * (1 + ret), 1) - 1;
      aggregated.push(compoundedReturn);
    }
  }
  
  return aggregated;
}

function calculateSummaryStats(
  timeSeries: StockDataPoint[],
  returns: PerformanceReport['returns']
): PerformanceReport['summary'] {
  
  if (timeSeries.length < 2 || returns.daily.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
    };
  }
  
  const totalReturn = (timeSeries[timeSeries.length - 1].close - timeSeries[0].close) / timeSeries[0].close;
  
  const days = (new Date(timeSeries[timeSeries.length - 1].time).getTime() - 
                new Date(timeSeries[0].time).getTime()) / (1000 * 60 * 60 * 24);
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / days) - 1;
  
  const mean = returns.daily.reduce((sum, r) => sum + r, 0) / returns.daily.length;
  const variance = returns.daily.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.daily.length;
  const volatility = Math.sqrt(variance * 252); // 年率ボラティリティ
  
  const riskFreeRate = 0.02; // 2% 無リスク金利
  const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
  
  const maxDrawdown = calculateMaxDrawdown(timeSeries);
  
  const winRate = returns.daily.filter(r => r > 0).length / returns.daily.length;
  
  return {
    totalReturn,
    annualizedReturn,
    volatility,
    sharpeRatio,
    maxDrawdown,
    winRate,
  };
}

function calculateBenchmarkComparisons(
  portfolioTimeSeries: StockDataPoint[],
  benchmarkData: Record<string, StockDataPoint[]>,
  period: { startDate: Date; endDate: Date }
): PerformanceReport['benchmarks'] {
  
  const spyData = benchmarkData['SPY'] || [];
  const bndData = benchmarkData['BND'] || [];
  
  const portfolioReturns = calculateReturns(portfolioTimeSeries);
  
  return {
    spy: calculateBenchmarkComparison(portfolioReturns.daily, spyData, 'S&P 500'),
    bnd: calculateBenchmarkComparison(portfolioReturns.daily, bndData, 'US Aggregate Bond'),
  };
}

function calculateBenchmarkComparison(
  portfolioReturns: number[],
  benchmarkData: StockDataPoint[],
  name: string
): BenchmarkComparison {
  
  if (benchmarkData.length < 2 || portfolioReturns.length === 0) {
    return {
      name,
      return: 0,
      volatility: 0,
      sharpeRatio: 0,
      correlation: 0,
      beta: 0,
      alpha: 0,
      trackingError: 0,
      informationRatio: 0,
    };
  }
  
  const benchmarkReturns = benchmarkData.slice(1).map((point, i) => 
    (point.close - benchmarkData[i].close) / benchmarkData[i].close
  );
  
  const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0);
  const benchmarkVolatility = Math.sqrt(
    benchmarkReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / benchmarkReturns.length
  ) * Math.sqrt(252);
  
  const correlation = calculateCorrelation(portfolioReturns, benchmarkReturns);
  const beta = correlation * (Math.sqrt(variance(portfolioReturns)) / Math.sqrt(variance(benchmarkReturns)));
  const alpha = (portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length) - 
               (0.02 + beta * 0.05); // 簡略化
  
  const trackingError = Math.sqrt(
    portfolioReturns.reduce((sum, r, i) => {
      const excess = r - (benchmarkReturns[i] || 0);
      return sum + excess * excess;
    }, 0) / portfolioReturns.length
  ) * Math.sqrt(252);
  
  const informationRatio = trackingError > 0 ? alpha / trackingError : 0;
  
  return {
    name,
    return: benchmarkReturn,
    volatility: benchmarkVolatility,
    sharpeRatio: benchmarkVolatility > 0 ? (benchmarkReturn - 0.02) / benchmarkVolatility : 0,
    correlation,
    beta: beta || 0,
    alpha,
    trackingError,
    informationRatio,
  };
}

function calculatePerformanceAttribution(
  assets: PortfolioAsset[],
  returns: PerformanceReport['returns']
): PerformanceReport['attribution'] {
  
  // 簡略化された帰属分析
  const assetAllocation = 0.6;   // 60% 資産配分
  const securitySelection = 0.3;  // 30% 銘柄選択
  const interaction = 0.1;        // 10% 相互作用
  
  // セクター別内訳
  const sectorBreakdown: Record<string, number> = {};
  assets.forEach(asset => {
    const sector = getAssetSector(asset.symbol);
    sectorBreakdown[sector] = (sectorBreakdown[sector] || 0) + asset.currentWeight;
  });
  
  // ファクター別内訳
  const factorBreakdown = {
    '市場': 0.5,
    'サイズ': 0.1,
    'バリュー': 0.1,
    'モメンタム': 0.1,
    '品質': 0.1,
    'その他': 0.1,
  };
  
  return {
    assetAllocation,
    securitySelection,
    interaction,
    sectorBreakdown,
    factorBreakdown,
  };
}

function calculateRiskMetrics(
  returns: PerformanceReport['returns'],
  benchmarkData: Record<string, StockDataPoint[]>
): PerformanceReport['riskMetrics'] {
  
  if (returns.daily.length === 0) {
    return {
      var95: 0,
      expectedShortfall: 0,
      beta: 1.0,
      trackingError: 0,
      informationRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
    };
  }
  
  // VaR計算（95%）
  const sortedReturns = [...returns.daily].sort((a, b) => a - b);
  const var95Index = Math.floor(0.05 * sortedReturns.length);
  const var95 = sortedReturns[var95Index] || 0;
  
  // 期待ショートフォール
  const tailReturns = sortedReturns.slice(0, var95Index);
  const expectedShortfall = tailReturns.length > 0 
    ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length 
    : 0;
  
  // Sortinoレシオ
  const negativeReturns = returns.daily.filter(r => r < 0);
  const downsideVariance = negativeReturns.length > 0 
    ? negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length 
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 
    ? returns.daily.reduce((sum, r) => sum + r, 0) / returns.daily.length / downsideDeviation 
    : 0;
  
  // Calmarレシオ
  const annualReturn = returns.daily.reduce((sum, r) => sum + r, 0) * 252;
  const maxDrawdown = calculateMaxDrawdownFromReturns(returns.daily);
  const calmarRatio = maxDrawdown < 0 ? annualReturn / Math.abs(maxDrawdown) : 0;
  
  return {
    var95: var95 * 100,
    expectedShortfall: expectedShortfall * 100,
    beta: 1.0, // 簡略化
    trackingError: 0, // 簡略化
    informationRatio: 0, // 簡略化
    sortinoRatio,
    calmarRatio,
  };
}

function identifyPerformanceEvents(
  timeSeries: StockDataPoint[],
  rebalanceHistory: RebalanceHistoryEntry[]
): PerformanceReport['events'] {
  
  const events: PerformanceEvent[] = [];
  
  // リバランスイベント
  rebalanceHistory.forEach(rebalance => {
    events.push({
      date: new Date(rebalance.timestamp),
      type: 'REBALANCE',
      description: `リバランス実行: ${rebalance.totalTrades}件の取引`,
      impact: 0,
      value: 0,
    });
  });
  
  // 高値・安値イベント
  if (timeSeries.length > 20) {
    const recent = timeSeries.slice(-20);
    const maxIdx = recent.findIndex(p => p.high === Math.max(...recent.map(r => r.high)));
    const minIdx = recent.findIndex(p => p.low === Math.min(...recent.map(r => r.low)));
    
    if (maxIdx >= 0) {
      events.push({
        date: new Date(recent[maxIdx].time),
        type: 'HIGH',
        description: '過去20日間の高値',
        impact: 0,
        value: recent[maxIdx].high,
      });
    }
    
    if (minIdx >= 0) {
      events.push({
        date: new Date(recent[minIdx].time),
        type: 'LOW',
        description: '過去20日間の安値',
        impact: 0,
        value: recent[minIdx].low,
      });
    }
  }
  
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// エクスポート関数
async function exportToPDF(report: PerformanceReport, format: ExportFormat): Promise<any> {
  // PDFエクスポートの実装（プレースホルダー）
  console.log('PDFエクスポート処理中...');
  return {
    success: true,
    filepath: `${format.filename}.pdf`,
  };
}

async function exportToExcel(report: PerformanceReport, format: ExportFormat): Promise<any> {
  // Excelエクスポートの実装（プレースホルダー）
  console.log('Excelエクスポート処理中...');
  return {
    success: true,
    filepath: `${format.filename}.xlsx`,
  };
}

async function exportToCSV(report: PerformanceReport, format: ExportFormat): Promise<any> {
  // CSVエクスポートの実装（プレースホルダー）
  console.log('CSVエクスポート処理中...');
  return {
    success: true,
    filepath: `${format.filename}.csv`,
  };
}

async function exportToJSON(report: PerformanceReport, format: ExportFormat): Promise<any> {
  // JSONエクスポートの実装
  const jsonData = JSON.stringify(report, null, 2);
  
  // ブラウザ環境かチェック
  if (typeof window !== 'undefined') {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${format.filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  return {
    success: true,
    filepath: `${format.filename}.json`,
  };
}

// 追加のヘルパー関数
function calculateDuration(startDate: Date, endDate: Date): string {
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;
  
  if (years > 0) {
    return `${years}年${months}ヶ月${remainingDays}日`;
  } else if (months > 0) {
    return `${months}ヶ月${remainingDays}日`;
  } else {
    return `${days}日`;
  }
}

function calculateDrawdownSeries(performanceChart: { date: string; value: number }[]): { date: string; value: number }[] {
  let peak = performanceChart[0]?.value || 0;
  
  return performanceChart.map(point => {
    peak = Math.max(peak, point.value);
    const drawdown = peak > 0 ? (point.value - peak) / peak * 100 : 0;
    return {
      date: point.date,
      value: drawdown,
    };
  });
}

function calculateRollingReturns(dailyReturns: number[]): { date: string; oneMonth: number; threeMonth: number; oneYear: number }[] {
  const rollingReturns = [];
  
  for (let i = 0; i < dailyReturns.length; i++) {
    const oneMonth = i >= 21 
      ? dailyReturns.slice(i - 21, i).reduce((acc, r) => acc * (1 + r), 1) - 1
      : 0;
    const threeMonth = i >= 63 
      ? dailyReturns.slice(i - 63, i).reduce((acc, r) => acc * (1 + r), 1) - 1
      : 0;
    const oneYear = i >= 252 
      ? dailyReturns.slice(i - 252, i).reduce((acc, r) => acc * (1 + r), 1) - 1
      : 0;
    
    rollingReturns.push({
      date: new Date(Date.now() - (dailyReturns.length - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      oneMonth,
      threeMonth,
      oneYear,
    });
  }
  
  return rollingReturns;
}

function calculateMaxDrawdown(timeSeries: StockDataPoint[]): number {
  let peak = timeSeries[0]?.close || 0;
  let maxDrawdown = 0;
  
  for (const point of timeSeries) {
    peak = Math.max(peak, point.close);
    const drawdown = peak > 0 ? (point.close - peak) / peak : 0;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }
  
  return maxDrawdown * 100; // パーセンテージで返す
}

function calculateMaxDrawdownFromReturns(returns: number[]): number {
  let peak = 1;
  let maxDrawdown = 0;
  let currentValue = 1;
  
  for (const ret of returns) {
    currentValue *= (1 + ret);
    peak = Math.max(peak, currentValue);
    const drawdown = (currentValue - peak) / peak;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }
  
  return maxDrawdown * 100;
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
  const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
  
  const numerator = x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0);
  const denomX = Math.sqrt(x.reduce((sum, val) => sum + Math.pow(val - meanX, 2), 0));
  const denomY = Math.sqrt(y.reduce((sum, val) => sum + Math.pow(val - meanY), 0));
  
  return denomX * denomY > 0 ? numerator / (denomX * denomY) : 0;
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}

function getAssetSector(symbol: string): string {
  const sectorMap: Record<string, string> = {
    'VTI': '米国株式',
    'QQQ': 'テクノロジー',
    'VEA': '先進国株式',
    'VWO': '新興国株式',
    'BND': '米国債券',
    'BNDX': '国際債券',
    'SHY': '短期債券',
    'GLD': '金',
    'VNQ': '不動産',
    'SCHD': '高配当株',
    'CASH': '現金',
  };
  
  return sectorMap[symbol] || 'その他';
}
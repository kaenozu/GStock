import { PortfolioAsset, RebalanceHistoryEntry } from '@/types/portfolio';
import { StockDataPoint } from '@/types/market';

interface PerformanceReport {
    period: {
        startDate: Date;
        endDate: Date;
        duration: number; // in days
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
        spy: {
            totalReturn: number;
            annualizedReturn: number;
            volatility: number;
            sharpeRatio: number;
            maxDrawdown: number;
            winRate: number;
        };
        bnd: {
            totalReturn: number;
            annualizedReturn: number;
            volatility: number;
            sharpeRatio: number;
            maxDrawdown: number;
            winRate: number;
        };
        custom?: {
            totalReturn: number;
            annualizedReturn: number;
            volatility: number;
            sharpeRatio: number;
            maxDrawdown: number;
            winRate: number;
        };
    };
    attribution: {
        assetAllocation: number;
        securitySelection: number;
        interaction: number;
        sectorBreakdown: Record<string, number>;
        factorBreakdown: Record<string, number>;
    };
}

interface ExportFormat {
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
  
  // 基本指標を計算
  const basicMetrics = calculateBasicMetrics(portfolioTimeSeries);
  
  // ベンチマークとの比較を計算
  const benchmarkComparison = calculateBenchmarkComparison(portfolioTimeSeries, benchmarkData);
  
  // アトリビューション分析
  const attribution = calculateAttribution(assets, historicalData, period);
  
  return {
    period: {
      ...period,
      duration: Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24))
    },
    summary: basicMetrics,
    returns,
    benchmarks: benchmarkComparison,
    attribution
  };
}

/**
 * ポートフォリオの時系列データを計算
 */
function calculatePortfolioTimeSeries(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  period: { startDate: Date; endDate: Date }
): StockDataPoint[] {
  // 日付範囲を取得
  const dateRange = generateDateRange(period.startDate, period.endDate);
  
  return dateRange.map(date => {
    let totalValue = 0;
    
    for (const asset of assets) {
      const assetData = historicalData[asset.symbol];
      if (!assetData) continue;
      
      const dayData = assetData.find(d => d.time.startsWith(date.toISOString().split('T')[0]));
      if (dayData) {
        totalValue += asset.quantity * dayData.close;
      }
    }
    
    return {
      time: date.toISOString(),
      open: totalValue,
      high: totalValue,
      low: totalValue,
      close: totalValue
    };
  });
}

/**
 * 日付範囲を生成
 */
function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * リターンを計算
 */
function calculateReturns(timeSeries: StockDataPoint[]): PerformanceReport['returns'] {
  const dailyReturns: number[] = [];
  const weeklyReturns: number[] = [];
  const monthlyReturns: number[] = [];
  
  // 日次リターン
  for (let i = 1; i < timeSeries.length; i++) {
    const prevClose = timeSeries[i - 1].close;
    const currClose = timeSeries[i].close;
    dailyReturns.push((currClose - prevClose) / prevClose);
  }
  
  // 週次リターン
  for (let i = 7; i < timeSeries.length; i += 7) {
    const prevClose = timeSeries[i - 7].close;
    const currClose = timeSeries[i].close;
    weeklyReturns.push((currClose - prevClose) / prevClose);
  }
  
  // 月次リターン
  for (let i = 30; i < timeSeries.length; i += 30) {
    const prevClose = timeSeries[i - 30].close;
    const currClose = timeSeries[i].close;
    monthlyReturns.push((currClose - prevClose) / prevClose);
  }
  
  return {
    daily: dailyReturns,
    weekly: weeklyReturns,
    monthly: monthlyReturns,
    quarterly: [], // 簡略化のため空
    yearly: [] // 簡略化のため空
  };
}

/**
 * 基本指標を計算
 */
function calculateBasicMetrics(timeSeries: StockDataPoint[]): PerformanceReport['summary'] {
  if (timeSeries.length < 2) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0
    };
  }
  
  const initialValue = timeSeries[0].close;
  const finalValue = timeSeries[timeSeries.length - 1].close;
  
  // 総リターン
  const totalReturn = (finalValue - initialValue) / initialValue;
  
  // 年率リターン
  const days = timeSeries.length;
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / days) - 1;
  
  // ボラティリティ
  const dailyReturns: number[] = [];
  for (let i = 1; i < timeSeries.length; i++) {
    const prevClose = timeSeries[i - 1].close;
    const currClose = timeSeries[i].close;
    dailyReturns.push((currClose - prevClose) / prevClose);
  }
  
  const mean = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / dailyReturns.length;
  const dailyVolatility = Math.sqrt(variance);
  const annualizedVolatility = dailyVolatility * Math.sqrt(365);
  
  // シャープレシオ
  const riskFreeRate = 0.02; // 2%と仮定
  const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;
  
  // 最大ドローダウン
  let maxDrawdown = 0;
  let peak = timeSeries[0].close;
  
  for (const point of timeSeries) {
    if (point.close > peak) {
      peak = point.close;
    }
    const drawdown = (peak - point.close) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  // 勝率
  const positiveDays = dailyReturns.filter(ret => ret > 0).length;
  const winRate = positiveDays / dailyReturns.length;
  
  return {
    totalReturn,
    annualizedReturn,
    volatility: annualizedVolatility,
    sharpeRatio,
    maxDrawdown,
    winRate
  };
}

/**
 * ベンチマークとの比較を計算
 */
function calculateBenchmarkComparison(
  portfolioTimeSeries: StockDataPoint[],
  benchmarkData: Record<string, StockDataPoint[]>
): PerformanceReport['benchmarks'] {
  const benchmarks: PerformanceReport['benchmarks'] = {
    spy: { totalReturn: 0, annualizedReturn: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0 },
    bnd: { totalReturn: 0, annualizedReturn: 0, volatility: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0 }
  };
  
  // SPY (S&P 500)
  if (benchmarkData.SPY && benchmarkData.SPY.length > 0) {
    benchmarks.spy = calculateBasicMetrics(benchmarkData.SPY);
  }
  
  // BND (債券)
  if (benchmarkData.BND && benchmarkData.BND.length > 0) {
    benchmarks.bnd = calculateBasicMetrics(benchmarkData.BND);
  }
  
  return benchmarks;
}

/**
 * アトリビューション分析
 */
function calculateAttribution(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  period: { startDate: Date; endDate: Date }
): PerformanceReport['attribution'] {
  // 簡略化されたアトリビューション分析
  const sectorBreakdown: Record<string, number> = {};
  const factorBreakdown: Record<string, number> = {};
  
  // セクター別の配分を計算
  for (const asset of assets) {
    const sector = 'EQUITY'; // 簡略化
    if (!sectorBreakdown[sector]) {
      sectorBreakdown[sector] = 0;
    }
    sectorBreakdown[sector] += asset.quantity * 100; // 簡略化
  }
  
  return {
    assetAllocation: 0.4, // 簡略化
    securitySelection: 0.3, // 簡略化
    interaction: 0.3, // 簡略化
    sectorBreakdown,
    factorBreakdown
  };
}

/**
 * レポートをエクスポート
 */
export function exportReport(
  report: PerformanceReport,
  format: ExportFormat,
  additionalData?: {
    transactions?: any[];
    riskMetrics?: any;
    customSections?: any[];
  }
): string {
  switch (format.format) {
    case 'JSON':
      return JSON.stringify(report, null, 2);
    
    case 'CSV':
      return generateCSV(report);
    
    case 'PDF':
      // PDF生成は別のライブラリを使用
      return generatePDFReport(report, format.options.language);
    
    case 'EXCEL':
      // Excel生成は別のライブラリを使用
      return generateExcelReport(report);
    
    default:
      throw new Error(`Unsupported format: ${format.format}`);
  }
}

/**
 * CSV形式でレポートを生成
 */
function generateCSV(report: PerformanceReport): string {
  const headers = ['期間', '総リターン', '年率リターン', 'ボラティリティ', 'シャープレシオ', '最大ドローダウン', '勝率'];
  const values = [
    `${report.period.startDate.toISOString().split('T')[0]} - ${report.period.endDate.toISOString().split('T')[0]}`,
    `${(report.summary.totalReturn * 100).toFixed(2)}%`,
    `${(report.summary.annualizedReturn * 100).toFixed(2)}%`,
    `${(report.summary.volatility * 100).toFixed(2)}%`,
    report.summary.sharpeRatio.toFixed(2),
    `${(report.summary.maxDrawdown * 100).toFixed(2)}%`,
    `${(report.summary.winRate * 100).toFixed(2)}%`
  ];
  
  return [headers.join(','), values.join(',')].join('\n');
}

/**
 * PDFレポートを生成（簡略化）
 */
function generatePDFReport(report: PerformanceReport, language: 'ja' | 'en'): string {
  const title = language === 'ja' ? 'ポートフォリオパフォーマンスレポート' : 'Portfolio Performance Report';
  const period = report.period.startDate.toISOString().split('T')[0] + ' ~ ' + 
                report.period.endDate.toISOString().split('T')[0];
  
  return `
    ${title}
    ${period}
    
    ${language === 'ja' ? 'サマリー' : 'Summary'}:
    - ${language === 'ja' ? '総リターン' : 'Total Return'}: ${(report.summary.totalReturn * 100).toFixed(2)}%
    - ${language === 'ja' ? '年率リターン' : 'Annualized Return'}: ${(report.summary.annualizedReturn * 100).toFixed(2)}%
    - ${language === 'ja' ? 'ボラティリティ' : 'Volatility'}: ${(report.summary.volatility * 100).toFixed(2)}%
    - ${language === 'ja' ? 'シャープレシオ' : 'Sharpe Ratio'}: ${report.summary.sharpeRatio.toFixed(2)}
    - ${language === 'ja' ? '最大ドローダウン' : 'Max Drawdown'}: ${(report.summary.maxDrawdown * 100).toFixed(2)}%
    - ${language === 'ja' ? '勝率' : 'Win Rate'}: ${(report.summary.winRate * 100).toFixed(2)}%
  `;
}

/**
 * Excelレポートを生成（簡略化）
 */
function generateExcelReport(report: PerformanceReport): string {
  return `Excel export not implemented. Please use CSV format instead.`;
}
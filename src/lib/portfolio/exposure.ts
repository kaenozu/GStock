/**
 * Sector and Region Exposure Analysis
 * Comprehensive exposure tracking and correlation analysis
 * @module lib/portfolio/exposure
 */

import { PortfolioAsset, AssetClass } from '@/types/portfolio';
import { StockDataPoint } from '@/types/market';

export interface SectorExposure {
  sector: string;
  weight: number;
  value: number;
  assets: string[];
  beta: number;
  pe: number;
  dividend: number;
  volatility: number;
}

export interface RegionExposure {
  region: string;
  weight: number;
  value: number;
  assets: string[];
  currency: string;
  marketCap: number;
  correlation: number;
}

export interface ExposureAnalysis {
  sectors: SectorExposure[];
  regions: RegionExposure[];
  totalExposure: {
    domestic: number;
    international: number;
    emerging: number;
    developed: number;
  };
  concentrationMetrics: {
    topSector: string;
    topSectorWeight: number;
    topRegion: string;
    topRegionWeight: number;
    herfindahlSectors: number;
    herfindahlRegions: number;
  };
  riskFactors: {
    currency: number;
    geopolitical: number;
    regulatory: number;
    environmental: number;
  };
}

export interface CorrelationMatrix {
  matrix: Record<string, Record<string, number>>;
  avgCorrelation: number;
  maxCorrelation: number;
  minCorrelation: number;
  riskContribution: Record<string, number>;
}

/**
 * Analyze sector and region exposures
 */
export function analyzeExposures(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  marketData?: Record<string, any>
): ExposureAnalysis {
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  // Sector analysis
  const sectors = analyzeSectorExposure(assets, historicalData, marketData);
  
  // Region analysis
  const regions = analyzeRegionExposure(assets, historicalData, marketData);
  
  // Total exposure breakdown
  const totalExposure = calculateTotalExposure(regions);
  
  // Concentration metrics
  const concentrationMetrics = calculateConcentrationMetrics(sectors, regions);
  
  // Risk factor analysis
  const riskFactors = analyzeRiskFactors(assets, sectors, regions);
  
  return {
    sectors,
    regions,
    totalExposure,
    concentrationMetrics,
    riskFactors,
  };
}

/**
 * Generate correlation matrix for portfolio assets
 */
export function generateCorrelationMatrix(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>
): CorrelationMatrix {
  const symbols = assets.map(a => a.symbol);
  const n = symbols.length;
  const matrix: Record<string, Record<string, number>> = {};
  let totalCorrelation = 0;
  let count = 0;
  let maxCorr = -1;
  let minCorr = 1;
  
  // Calculate correlations
  symbols.forEach(symbol1 => {
    matrix[symbol1] = {};
    symbols.forEach(symbol2 => {
      if (symbol1 === symbol2) {
        matrix[symbol1][symbol2] = 1.0;
      } else {
        const data1 = historicalData[symbol1] || [];
        const data2 = historicalData[symbol2] || [];
        const corr = calculateCorrelation(data1, data2);
        matrix[symbol1][symbol2] = corr;
        
        if (symbol1 < symbol2) { // Count each pair once
          totalCorrelation += Math.abs(corr);
          count++;
          maxCorr = Math.max(maxCorr, corr);
          minCorr = Math.min(minCorr, corr);
        }
      }
    });
  });
  
  // Calculate risk contributions
  const riskContribution = calculateRiskContributions(assets, matrix);
  
  return {
    matrix,
    avgCorrelation: count > 0 ? totalCorrelation / count : 0,
    maxCorrelation: maxCorr,
    minCorrelation: minCorr,
    riskContribution,
  };
}

/**
 * Analyze sector exposure
 */
function analyzeSectorExposure(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  marketData?: Record<string, any>
): SectorExposure[] {
  const sectorMap: Record<string, {
    weight: number;
    value: number;
    assets: string[];
    betas: number[];
    pes: number[];
    dividends: number[];
    volatilities: number[];
  }> = {};
  
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  assets.forEach(asset => {
    const sector = getAssetSector(asset.symbol);
    const weight = (asset.totalValue / totalValue) * 100;
    
    if (!sectorMap[sector]) {
      sectorMap[sector] = {
        weight: 0,
        value: 0,
        assets: [],
        betas: [],
        pes: [],
        dividends: [],
        volatilities: [],
      };
    }
    
    sectorMap[sector].weight += weight;
    sectorMap[sector].value += asset.totalValue;
    sectorMap[sector].assets.push(asset.symbol);
    
    // Get market data
    const data = marketData?.[asset.symbol] || {};
    sectorMap[sector].betas.push(data.beta || 1.0);
    sectorMap[sector].pes.push(data.pe || 20.0);
    sectorMap[sector].dividends.push(data.dividend || 0.02);
    
    // Calculate volatility
    const priceData = historicalData[asset.symbol] || [];
    const volatility = calculateVolatility(priceData);
    sectorMap[sector].volatilities.push(volatility);
  });
  
  // Convert to SectorExposure array
  return Object.entries(sectorMap).map(([sector, data]) => ({
    sector,
    weight: data.weight,
    value: data.value,
    assets: data.assets,
    beta: data.betas.reduce((sum, b) => sum + b, 0) / data.betas.length,
    pe: data.pes.reduce((sum, pe) => sum + pe, 0) / data.pes.length,
    dividend: data.dividends.reduce((sum, d) => sum + d, 0) / data.dividends.length,
    volatility: data.volatilities.reduce((sum, v) => sum + v, 0) / data.volatilities.length,
  })).sort((a, b) => b.weight - a.weight);
}

/**
 * Analyze region exposure
 */
function analyzeRegionExposure(
  assets: PortfolioAsset[],
  historicalData: Record<string, StockDataPoint[]>,
  marketData?: Record<string, any>
): RegionExposure[] {
  const regionMap: Record<string, {
    weight: number;
    value: number;
    assets: string[];
    currencies: string[];
    marketCaps: number[];
    correlations: number[];
  }> = {};
  
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  assets.forEach(asset => {
    const region = getAssetRegion(asset.symbol);
    const weight = (asset.totalValue / totalValue) * 100;
    
    if (!regionMap[region]) {
      regionMap[region] = {
        weight: 0,
        value: 0,
        assets: [],
        currencies: [],
        marketCaps: [],
        correlations: [],
      };
    }
    
    regionMap[region].weight += weight;
    regionMap[region].value += asset.totalValue;
    regionMap[region].assets.push(asset.symbol);
    
    // Get region data
    const data = marketData?.[asset.symbol] || {};
    regionMap[region].currencies.push(data.currency || 'USD');
    regionMap[region].marketCaps.push(data.marketCap || 1000000000);
    
    // Calculate correlation with market (simplified)
    const priceData = historicalData[asset.symbol] || [];
    const marketCorr = calculateMarketCorrelation(priceData);
    regionMap[region].correlations.push(marketCorr);
  });
  
  // Convert to RegionExposure array
  return Object.entries(regionMap).map(([region, data]) => ({
    region,
    weight: data.weight,
    value: data.value,
    assets: data.assets,
    currency: getMostCommonCurrency(data.currencies),
    marketCap: data.marketCaps.reduce((sum, mc) => sum + mc, 0),
    correlation: data.correlations.reduce((sum, c) => sum + c, 0) / data.correlations.length,
  })).sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate total exposure by category
 */
function calculateTotalExposure(regions: RegionExposure[]): ExposureAnalysis['totalExposure'] {
  const domestic = regions.find(r => r.region === 'US')?.weight || 0;
  const international = regions.filter(r => r.region !== 'US').reduce((sum, r) => sum + r.weight, 0);
  const emerging = regions.filter(r => r.region.includes('Emerging')).reduce((sum, r) => sum + r.weight, 0);
  const developed = regions.filter(r => r.region.includes('Developed') || r.region === 'US').reduce((sum, r) => sum + r.weight, 0);
  
  return { domestic, international, emerging, developed };
}

/**
 * Calculate concentration metrics
 */
function calculateConcentrationMetrics(
  sectors: SectorExposure[],
  regions: RegionExposure[]
): ExposureAnalysis['concentrationMetrics'] {
  const topSector = sectors[0]?.sector || '';
  const topSectorWeight = sectors[0]?.weight || 0;
  const topRegion = regions[0]?.region || '';
  const topRegionWeight = regions[0]?.weight || 0;
  
  // Herfindahl index for sectors
  const herfindahlSectors = sectors.reduce((sum, s) => sum + Math.pow(s.weight / 100, 2), 0);
  
  // Herfindahl index for regions
  const herfindahlRegions = regions.reduce((sum, r) => sum + Math.pow(r.weight / 100, 2), 0);
  
  return {
    topSector,
    topSectorWeight,
    topRegion,
    topRegionWeight,
    herfindahlSectors,
    herfindahlRegions,
  };
}

/**
 * Analyze risk factors
 */
function analyzeRiskFactors(
  assets: PortfolioAsset[],
  sectors: SectorExposure[],
  regions: RegionExposure[]
): ExposureAnalysis['riskFactors'] {
  // Currency risk (based on international exposure)
  const currency = regions.filter(r => r.region !== 'US').reduce((sum, r) => sum + r.weight, 0) / 100;
  
  // Geopolitical risk (based on emerging markets exposure)
  const geopolitical = regions.filter(r => r.region.includes('Emerging')).reduce((sum, r) => sum + r.weight, 0) / 100;
  
  // Regulatory risk (based on sector concentration)
  const regulatory = sectors.filter(s => ['Financial', 'Healthcare', 'Energy'].includes(s.sector))
    .reduce((sum, s) => sum + s.weight, 0) / 100;
  
  // Environmental risk (based on sector exposure)
  const environmental = sectors.filter(s => ['Energy', 'Materials', 'Utilities'].includes(s.sector))
    .reduce((sum, s) => sum + s.weight, 0) / 100;
  
  return { currency, geopolitical, regulatory, environmental };
}

/**
 * Calculate risk contributions
 */
function calculateRiskContributions(
  assets: PortfolioAsset[],
  correlationMatrix: Record<string, Record<string, number>>
): Record<string, number> {
  const contributions: Record<string, number> = {};
  const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
  
  assets.forEach(asset => {
    const weight = asset.totalValue / totalValue;
    const avgCorrelation = Object.values(correlationMatrix[asset.symbol] || {})
      .reduce((sum, corr) => sum + Math.abs(corr), 0) / assets.length;
    
    // Simplified risk contribution
    contributions[asset.symbol] = weight * avgCorrelation;
  });
  
  return contributions;
}

// Helper functions
function getAssetSector(symbol: string): string {
  const sectorMap: Record<string, string> = {
    'VTI': 'US Large Cap',
    'VO': 'US Mid Cap',
    'VB': 'US Small Cap',
    'QQQ': 'Technology',
    'VGT': 'Technology',
    'VWO': 'Emerging Markets',
    'VEA': 'Developed Markets',
    'BND': 'US Bonds',
    'BNDX': 'International Bonds',
    'SHY': 'Short-term Bonds',
    'GLD': 'Gold',
    'SLV': 'Silver',
    'VNQ': 'Real Estate',
    'SCHD': 'Dividend Stocks',
    'VIG': 'Growth Stocks',
    'VYM': 'Value Stocks',
    'XLF': 'Financial',
    'XLV': 'Healthcare',
    'XLE': 'Energy',
    'XLI': 'Industrial',
    'XLK': 'Technology',
    'XLU': 'Utilities',
    'XLP': 'Consumer Staples',
    'XLY': 'Consumer Discretionary',
    'XLB': 'Materials',
    'XLRE': 'Real Estate',
    'CASH': 'Cash',
  };
  
  return sectorMap[symbol] || 'Other';
}

function getAssetRegion(symbol: string): string {
  const regionMap: Record<string, string> = {
    'VTI': 'US',
    'VO': 'US',
    'VB': 'US',
    'QQQ': 'US',
    'VGT': 'US',
    'VWO': 'Emerging Markets',
    'VEA': 'Developed Markets',
    'BND': 'US',
    'BNDX': 'International Bonds',
    'SHY': 'US',
    'GLD': 'Global',
    'SLV': 'Global',
    'VNQ': 'US',
    'SCHD': 'US',
    'VIG': 'US',
    'VYM': 'US',
    'XLF': 'US',
    'XLV': 'US',
    'XLE': 'US',
    'XLI': 'US',
    'XLK': 'US',
    'XLU': 'US',
    'XLP': 'US',
    'XLY': 'US',
    'XLB': 'US',
    'XLRE': 'US',
    'CASH': 'US',
  };
  
  return regionMap[symbol] || 'Global';
}

function getMostCommonCurrency(currencies: string[]): string {
  const counts: Record<string, number> = {};
  currencies.forEach(curr => {
    counts[curr] = (counts[curr] || 0) + 1;
  });
  
  return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

function calculateVolatility(data: StockDataPoint[]): number {
  if (data.length < 2) return 0.15; // Default volatility
  
  const returns = data.slice(1).map((point, i) => (point.close - data[i].close) / data[i].close);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance * 252); // Annualized
}

function calculateCorrelation(data1: StockDataPoint[], data2: StockDataPoint[]): number {
  if (data1.length < 2 || data2.length < 2) return 0;
  
  const returns1 = data1.slice(1).map((point, i) => (point.close - data1[i].close) / data1[i].close);
  const returns2 = data2.slice(1).map((point, i) => (point.close - data2[i].close) / data2[i].close);
  
  const minLength = Math.min(returns1.length, returns2.length);
  const r1 = returns1.slice(0, minLength);
  const r2 = returns2.slice(0, minLength);
  
  const mean1 = r1.reduce((sum, r) => sum + r, 0) / r1.length;
  const mean2 = r2.reduce((sum, r) => sum + r, 0) / r2.length;
  
  const numerator = r1.reduce((sum, r, i) => sum + (r - mean1) * (r2[i] - mean2), 0);
  const denom1 = Math.sqrt(r1.reduce((sum, r) => sum + Math.pow(r - mean1, 2), 0));
  const denom2 = Math.sqrt(r2.reduce((sum, r) => sum + Math.pow(r - mean2, 2), 0));
  
  return denom1 * denom2 > 0 ? numerator / (denom1 * denom2) : 0;
}

function calculateMarketCorrelation(data: StockDataPoint[]): number {
  // Simplified market correlation calculation
  // In practice, would compare against market index (SPY, etc.)
  if (data.length < 20) return 0.5;
  
  const recent = data.slice(-20);
  const returns = recent.slice(1).map((point, i) => (point.close - recent[i].close) / recent[i].close);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate autocorrelation as proxy for market correlation
  const autocorr = returns.reduce((sum, r, i) => {
    if (i === 0) return sum;
    return sum + (r - mean) * (returns[i-1] - mean);
  }, 0) / (returns.length - 1);
  
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return variance > 0 ? Math.abs(autocorr / variance) : 0.5;
}
'use client';

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PortfolioAsset } from '@/types/portfolio';
import { ASSET_CLASS_COLORS } from '@/lib/portfolio/strategies';
import { formatCurrency } from '@/lib/portfolio/calculator';
import styles from './AllocationChart.module.css';

interface AllocationChartProps {
  assets: PortfolioAsset[];
  totalValue: number;
  showTarget?: boolean;
}

// Custom colors for each asset
const ASSET_COLORS: Record<string, string> = {
  VTI: '#3b82f6',   // Blue
  QQQ: '#8b5cf6',   // Purple
  VEA: '#06b6d4',   // Cyan
  VWO: '#10b981',   // Green
  BND: '#22c55e',   // Light Green
  BNDX: '#84cc16',  // Lime
  SHY: '#a3e635',   // Yellow-Green
  GLD: '#f59e0b',   // Amber
  VNQ: '#ec4899',   // Pink
  SCHD: '#f43f5e',  // Rose
  CASH: '#6b7280',  // Gray
};

const getAssetColor = (symbol: string, assetClass: string): string => {
  return ASSET_COLORS[symbol] || ASSET_CLASS_COLORS[assetClass] || '#6b7280';
};

// Custom tooltip - defined outside component
interface TooltipPayloadItem {
  payload: { name: string; value: number; amount?: number };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={styles.tooltip}>
        <div className={styles.tooltipTitle}>{data.name}</div>
        <div className={styles.tooltipValue}>
          {data.value.toFixed(1)}%
          {data.amount !== undefined && (
            <span className={styles.tooltipAmount}>
              {formatCurrency(data.amount)}
            </span>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Legend item type
interface LegendItem {
  name: string;
  color: string;
}

// Simple legend component - defined outside
const SimpleLegend: React.FC<{ data: LegendItem[] }> = ({ data }) => (
  <div className={styles.legend}>
    {data.map((entry, index) => (
      <div key={`legend-${index}`} className={styles.legendItem}>
        <div
          className={styles.legendDot}
          style={{ backgroundColor: entry.color }}
        />
        <span>{entry.name}</span>
      </div>
    ))}
  </div>
);

export const AllocationChart: React.FC<AllocationChartProps> = ({
  assets,
  totalValue,
  showTarget = true,
}) => {
  // Prepare data for current allocation
  const currentData = useMemo(() => {
    return assets
      .filter(a => a.currentWeight > 0.5) // Filter out tiny allocations
      .map(asset => ({
        name: asset.symbol,
        value: asset.currentWeight,
        amount: asset.totalValue,
        color: getAssetColor(asset.symbol, asset.assetClass),
        assetClass: asset.assetClass,
      }));
  }, [assets]);

  // Prepare data for target allocation
  const targetData = useMemo(() => {
    return assets
      .filter(a => a.targetWeight > 0)
      .map(asset => ({
        name: asset.symbol,
        value: asset.targetWeight,
        color: getAssetColor(asset.symbol, asset.assetClass),
      }));
  }, [assets]);

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            {/* Target allocation (outer ring) */}
            {showTarget && (
              <Pie
                data={targetData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={85}
                paddingAngle={2}
                opacity={0.4}
              >
                {targetData.map((entry, index) => (
                  <Cell key={`target-${index}`} fill={entry.color} />
                ))}
              </Pie>
            )}
            
            {/* Current allocation (inner ring) */}
            <Pie
              data={currentData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={showTarget ? 45 : 50}
              outerRadius={showTarget ? 65 : 80}
              paddingAngle={2}
            >
              {currentData.map((entry, index) => (
                <Cell key={`current-${index}`} fill={entry.color} />
              ))}
            </Pie>
            
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Simple Legend */}
        <SimpleLegend data={currentData} />
        
        {/* Center label */}
        <div className={styles.centerLabel}>
          <div className={styles.centerValue}>
            {formatCurrency(totalValue)}
          </div>
          <div className={styles.centerSubtext}>総資産</div>
        </div>
      </div>
      
      {showTarget && (
        <div className={styles.ringLegend}>
          <div className={styles.ringItem}>
            <div className={styles.ringIndicator} style={{ opacity: 1 }} />
            <span>現在</span>
          </div>
          <div className={styles.ringItem}>
            <div className={styles.ringIndicator} style={{ opacity: 0.4 }} />
            <span>目標</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationChart;

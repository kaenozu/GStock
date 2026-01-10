'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  PieChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { getAllStrategies, RISK_COLORS, ASSET_CLASS_COLORS } from '@/lib/portfolio/strategies';
import { formatCurrency, formatPercent } from '@/lib/portfolio/calculator';
import { StrategyType, PortfolioAsset, RebalanceAction } from '@/types/portfolio';
import styles from './PortfolioManager.module.css';
import { AllocationChart } from './AllocationChart';

export const PortfolioManager: React.FC = () => {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    isLoading,
    isPriceUpdating,
    error,
    lastPriceUpdate,
    setActiveProfileId,
    createProfile,
    deleteProfile,
    getRebalanceActions,
    isRebalanceNeeded,
    executeRebalance,
    fetchPrices,
    startAutoRefresh,
    stopAutoRefresh,
  } = usePortfolio();

  const [autoRefresh, setAutoRefresh] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('assets');

  const strategies = getAllStrategies();
  const rebalanceActions = getRebalanceActions();
  const needsRebalance = isRebalanceNeeded();

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Handle auto-refresh toggle
  useEffect(() => {
    if (autoRefresh && activeProfile) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    return () => stopAutoRefresh();
  }, [autoRefresh, activeProfile, startAutoRefresh, stopAutoRefresh]);

  // Format last update time
  const formatLastUpdate = (isoString: string | null) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Briefcase size={20} />
          <h2>ポートフォリオ管理</h2>
        </div>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} />
          新規作成
        </button>
      </div>

      {/* Profile Selector */}
      {profiles.length > 0 && (
        <div className={styles.profileSelector}>
          <select
            value={activeProfileId || ''}
            onChange={(e) => setActiveProfileId(e.target.value || null)}
            className={styles.select}
          >
            <option value="">ポートフォリオを選択...</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {activeProfile && (
            <button
              className={styles.deleteButton}
              onClick={() => deleteProfile(activeProfile.id)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      {/* No Profile State */}
      {!activeProfile && profiles.length === 0 && (
        <div className={styles.emptyState}>
          <PieChart size={48} className={styles.emptyIcon} />
          <p>ポートフォリオがありません</p>
          <p className={styles.emptySubtext}>「新規作成」をクリックして開始</p>
        </div>
      )}

      {/* Active Profile Display */}
      {activeProfile && (
        <>
          {/* Summary Card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <div>
                <h3>{activeProfile.name}</h3>
                <span
                  className={styles.riskBadge}
                  style={{ backgroundColor: RISK_COLORS[activeProfile.riskLevel] }}
                >
                  {activeProfile.riskLevel === 'AGGRESSIVE' && 'アグレッシブ'}
                  {activeProfile.riskLevel === 'MODERATE' && 'バランス'}
                  {activeProfile.riskLevel === 'CONSERVATIVE' && '保守的'}
                </span>
              </div>
              <div className={styles.totalValue}>
                {formatCurrency(activeProfile.metrics.totalValue)}
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>総損益</span>
                <span className={`${styles.metricValue} ${activeProfile.metrics.totalGainLoss >= 0 ? styles.positive : styles.negative}`}>
                  {activeProfile.metrics.totalGainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {formatCurrency(activeProfile.metrics.totalGainLoss)}
                  ({formatPercent(activeProfile.metrics.totalGainLossPercent)})
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>シャープレシオ</span>
                <span className={styles.metricValue}>
                  {activeProfile.metrics.sharpeRatio.toFixed(2)}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>分散度</span>
                <span className={styles.metricValue}>
                  {(activeProfile.metrics.concentration * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Chart */}
          <AllocationChart
            assets={activeProfile.assets}
            totalValue={activeProfile.metrics.totalValue}
            showTarget={true}
          />

          {/* Price Update Controls */}
          <div className={styles.priceControls}>
            <button
              className={`${styles.refreshButton} ${isPriceUpdating ? styles.spinning : ''}`}
              onClick={fetchPrices}
              disabled={isPriceUpdating}
            >
              <RefreshCw size={14} />
              {isPriceUpdating ? '更新中...' : '価格更新'}
            </button>
            <label className={styles.autoRefreshLabel}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              自動更新
            </label>
            {lastPriceUpdate && (
              <span className={styles.lastUpdate}>
                最終更新: {formatLastUpdate(lastPriceUpdate)}
              </span>
            )}
            {error && <span className={styles.errorText}>{error}</span>}
          </div>

          {/* Rebalance Alert */}
          {needsRebalance && (
            <div className={styles.rebalanceAlert}>
              <AlertTriangle size={16} />
              <span>リバランスが必要です（乖離が閾値を超えています）</span>
              <button onClick={executeRebalance} className={styles.rebalanceButton}>
                <RefreshCw size={14} />
                実行
              </button>
            </div>
          )}

          {/* Assets Section */}
          <div className={styles.section}>
            <button
              className={styles.sectionHeader}
              onClick={() => toggleSection('assets')}
            >
              <span>保有資産 ({activeProfile.assets.length})</span>
              {expandedSection === 'assets' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSection === 'assets' && (
              <div className={styles.assetsList}>
                {activeProfile.assets.map(asset => (
                  <AssetRow key={asset.symbol} asset={asset} />
                ))}
              </div>
            )}
          </div>

          {/* Rebalance Actions Section */}
          {rebalanceActions.length > 0 && (
            <div className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection('rebalance')}
              >
                <span>リバランスアクション ({rebalanceActions.length})</span>
                {expandedSection === 'rebalance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSection === 'rebalance' && (
                <div className={styles.actionsList}>
                  {rebalanceActions.map(action => (
                    <ActionRow key={action.symbol} action={action} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePortfolioModal
          strategies={strategies}
          onClose={() => setShowCreateModal(false)}
          onCreate={(type) => {
            createProfile(type);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

// Asset Row Component
const AssetRow: React.FC<{ asset: PortfolioAsset }> = ({ asset }) => {
  const isPositive = asset.gainLossPercent >= 0;

  return (
    <div className={styles.assetRow}>
      <div className={styles.assetInfo}>
        <div
          className={styles.assetClassDot}
          style={{ backgroundColor: ASSET_CLASS_COLORS[asset.assetClass] }}
        />
        <div>
          <div className={styles.assetSymbol}>{asset.symbol}</div>
          <div className={styles.assetName}>{asset.name}</div>
        </div>
      </div>
      <div className={styles.assetWeights}>
        <div className={styles.weightBar}>
          <div
            className={styles.weightFill}
            style={{ width: `${asset.currentWeight}%` }}
          />
          <div
            className={styles.targetMarker}
            style={{ left: `${asset.targetWeight}%` }}
          />
        </div>
        <div className={styles.weightLabels}>
          <span>{asset.currentWeight.toFixed(1)}%</span>
          <span className={styles.targetLabel}>目標: {asset.targetWeight}%</span>
        </div>
      </div>
      <div className={styles.assetValue}>
        <div>{formatCurrency(asset.totalValue)}</div>
        <div className={`${styles.assetGain} ${isPositive ? styles.positive : styles.negative}`}>
          {formatPercent(asset.gainLossPercent)}
        </div>
      </div>
    </div>
  );
};

// Action Row Component
const ActionRow: React.FC<{ action: RebalanceAction }> = ({ action }) => {
  const isBuy = action.action === 'BUY';

  return (
    <div className={`${styles.actionRow} ${isBuy ? styles.buyAction : styles.sellAction}`}>
      <div className={styles.actionType}>
        {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        <span>{isBuy ? '購入' : '売却'}</span>
      </div>
      <div className={styles.actionSymbol}>{action.symbol}</div>
      <div className={styles.actionQuantity}>{action.quantity}株</div>
      <div className={styles.actionCost}>{formatCurrency(action.estimatedCost)}</div>
      <div className={styles.actionDeviation}>
        {action.currentWeight.toFixed(1)}% → {action.targetWeight.toFixed(1)}%
      </div>
    </div>
  );
};

// Create Portfolio Modal
interface CreateModalProps {
  strategies: { type: StrategyType; name: string; description: string; riskLevel: string }[];
  onClose: () => void;
  onCreate: (type: StrategyType) => void;
}

const CreatePortfolioModal: React.FC<CreateModalProps> = ({ strategies, onClose, onCreate }) => {
  const [selected, setSelected] = useState<StrategyType | null>(null);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>新規ポートフォリオ作成</h3>
        <p className={styles.modalSubtitle}>戦略を選択してください</p>

        <div className={styles.strategyList}>
          {strategies.map(s => (
            <button
              key={s.type}
              className={`${styles.strategyCard} ${selected === s.type ? styles.selected : ''}`}
              onClick={() => setSelected(s.type)}
            >
              <div className={styles.strategyHeader}>
                <span className={styles.strategyName}>{s.name}</span>
                <span
                  className={styles.riskBadge}
                  style={{ backgroundColor: RISK_COLORS[s.riskLevel] }}
                >
                  {s.riskLevel === 'AGGRESSIVE' && 'アグレッシブ'}
                  {s.riskLevel === 'MODERATE' && 'バランス'}
                  {s.riskLevel === 'CONSERVATIVE' && '保守的'}
                </span>
              </div>
              <p className={styles.strategyDesc}>{s.description}</p>
              {selected === s.type && (
                <CheckCircle size={20} className={styles.checkIcon} />
              )}
            </button>
          ))}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onClose}>
            キャンセル
          </button>
          <button
            className={styles.confirmButton}
            disabled={!selected}
            onClick={() => selected && onCreate(selected)}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioManager;

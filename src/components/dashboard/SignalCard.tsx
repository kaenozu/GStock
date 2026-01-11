import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from '@/app/page.module.css';
import { AnalysisResult, DisplaySignal } from '@/types/market';
import { Skeleton, SkeletonCard } from '@/components/common/Skeleton';

interface SignalCardProps {
  scanningSymbol: string | null;
  isScanLoading: boolean;
  isPaused?: boolean; // Reserved for future use
  currentAnalysis: AnalysisResult | null;
  displaySignal: DisplaySignal;
  bestTrade: AnalysisResult | null;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string, price: number, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => void;
  children?: React.ReactNode;
}

const SignalCardComponent: React.FC<SignalCardProps> = ({
  scanningSymbol,
  isScanLoading,
  isPaused: _isPaused,
  currentAnalysis,
  displaySignal,
  bestTrade,
  isInWatchlist,
  onToggleWatchlist,
  children
}) => {
  const getSignalIcon = () => {
    switch (displaySignal.type) {
      case 'BUY': return <TrendingUp className={styles.signalIcon} />;
      case 'SELL': return <TrendingDown className={styles.signalIcon} />;
      default: return <Minus className={styles.signalIcon} />;
    }
  };

  const getSignalClass = () => {
    switch (displaySignal.type) {
      case 'BUY': return styles.signalBuy;
      case 'SELL': return styles.signalSell;
      default: return styles.signalHold;
    }
  };

  // Show skeleton while loading initial data
  const isInitialLoading = isScanLoading && !currentAnalysis;

  if (isInitialLoading) {
    return (
      <div className={styles.signalCard}>
        <div className={styles.liveAnalysisStrip}>
          <Skeleton width="120px" height="1rem" />
          <Skeleton width="80px" height="1rem" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className={styles.signalCard}>
      <div className={styles.liveAnalysisStrip}>
        <div className={styles.liveStats}>
          <span>📡 {scanningSymbol || 'Waiting...'}</span>
          {isScanLoading && <span className={styles.scanPulse}>●</span>}
        </div>
        {currentAnalysis && (
          <div className={styles.liveAnalysisData}>
            <span>💰 ${currentAnalysis.stats?.price?.toFixed(2) || '0.00'}</span>
            <span>🎯 {currentAnalysis.confidence}%</span>
          </div>
        )}
      </div>

      <div className={`${styles.signalDisplay} ${getSignalClass()}`}>
        <div className={styles.signalHeader}>
          <Target size={20} />
          <span>AIシグナル</span>
        </div>
        <div className={styles.signalContent}>
          {getSignalIcon()}
          <h1 className={styles.signalText}>{displaySignal.text}</h1>
        </div>
        <p className={styles.signalAction}>{displaySignal.action}</p>
      </div>

      {bestTrade && bestTrade.optimalParams && (
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
          🎛️ 最適化済み: Buy閾値 {bestTrade.optimalParams.buyThreshold}%
        </div>
      )}

      {scanningSymbol && currentAnalysis && (
        <button
          className={styles.watchlistBtn}
          onClick={() => onToggleWatchlist(scanningSymbol, currentAnalysis.stats?.price || 0, currentAnalysis.sentiment)}
        >
          {isInWatchlist ? '★ ウォッチリストから削除' : '☆ ウォッチリストに追加'}
        </button>
      )}

      {children}
    </div>
  );
};

export const SignalCard = React.memo(SignalCardComponent);

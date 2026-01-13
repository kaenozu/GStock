/**
 * SignalCard Component
 * @description AIシグナルと価格表示カード（Tailwind CSS版）
 * @module components/dashboard/SignalCard
 */

import React from 'react';
import { Target, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { AnalysisResult, DisplaySignal } from '@/types/market';
import { Skeleton, SkeletonCard } from '@/components/common/Skeleton';
import { NormalizedPrice } from '@/lib/websocket';

interface SignalCardProps {
  scanningSymbol: string | null;
  isScanLoading: boolean;
  isPaused: boolean;
  currentAnalysis: AnalysisResult | null;
  displaySignal: DisplaySignal;
  bestTrade: AnalysisResult | null;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string, price: number, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => void;
  children?: React.ReactNode;
  /** リアルタイム価格（WebSocketから） */
  realtimePrice?: NormalizedPrice | null;
}

const SignalCardComponent: React.FC<SignalCardProps> = ({
  scanningSymbol,
  isScanLoading,
  isPaused,
  currentAnalysis,
  displaySignal,
  bestTrade,
  isInWatchlist,
  onToggleWatchlist,
  children,
  realtimePrice,
}) => {
  // リアルタイム価格があればそれを使用、なければ分析結果の価格
  const displayPrice = realtimePrice?.price ?? currentAnalysis?.stats?.price ?? 0;
  const isRealtimeActive = !!realtimePrice;

  // Flash Effect State
  const [flashColor, setFlashColor] = React.useState<'green' | 'red' | null>(null);
  const prevPriceRef = React.useRef(displayPrice);

  React.useEffect(() => {
    if (displayPrice > prevPriceRef.current) {
      setFlashColor('green');
    } else if (displayPrice < prevPriceRef.current) {
      setFlashColor('red');
    }
    prevPriceRef.current = displayPrice;

    const timer = setTimeout(() => setFlashColor(null), 300);
    return () => clearTimeout(timer);
  }, [displayPrice]);

  const getSignalIcon = () => {
    switch (displaySignal.type) {
      case 'BUY': return <TrendingUp className="mb-4 opacity-90 w-16 h-16" />;
      case 'SELL': return <TrendingDown className="mb-4 opacity-90 w-16 h-16" />;
      default: return <Minus className="mb-4 opacity-90 w-16 h-16" />;
    }
  };

  const getContainerStyles = () => {
    const base = "bg-black/30 rounded-xl p-6 relative overflow-hidden border min-h-[300px] flex flex-col transition-all duration-300 ease";
    switch (displaySignal.type) {
      case 'BUY': return `${base} border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]`;
      case 'SELL': return `${base} border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]`;
      default: return `${base} border-cyan-400/50`;
    }
  };

  const getSignalColor = () => {
    switch (displaySignal.type) {
      case 'BUY': return "text-emerald-500";
      case 'SELL': return "text-red-500";
      default: return "text-cyan-400";
    }
  };

  // Show skeleton while loading initial data
  const isInitialLoading = isScanLoading && !currentAnalysis;

  if (isInitialLoading) {
    return (
      <div className="bg-black/30 rounded-xl p-6 relative overflow-hidden border border-zinc-800 min-h-[300px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <Skeleton width="120px" height="1rem" />
          <Skeleton width="80px" height="1rem" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  // Determine Price Color based on flash
  const getPriceColor = () => {
    if (flashColor === 'green') return 'text-emerald-400';
    if (flashColor === 'red') return 'text-red-400';
    return 'text-slate-200';
  };

  return (
    <div className={getContainerStyles()}>
      {/* Live Analysis Strip */}
      <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
        <div className="flex gap-3 items-center">
          <span className="bg-white/5 py-0.5 px-2 rounded flex items-center gap-2">
            📡 {scanningSymbol || '銘柄選択中...'}
            {isScanLoading && <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse block"></span>}
          </span>
        </div>
        {currentAnalysis && (
          <div className="flex gap-3">
            <span className={`bg-white/5 py-0.5 px-2 rounded flex items-center gap-1 transition-colors duration-300 ${getPriceColor()}`}>
              {isRealtimeActive && (
                <Zap size={12} className="text-emerald-500 animate-pulse" />
              )}
              💰 ${displayPrice.toFixed(2)}
            </span>
            <span className="bg-white/5 py-0.5 px-2 rounded">🎯 {currentAnalysis.confidence}%</span>
          </div>
        )}
      </div>

      {/* Signal Display */}
      <div className={`flex-1 flex flex-col items-center justify-center py-4 ${getSignalColor()}`}>
        <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold mb-2 self-start w-full justify-center">
          <Target size={16} />
          <span>AIシグナル</span>
        </div>

        {getSignalIcon()}
        <h1 className="text-4xl font-black uppercase m-0 drop-shadow-md tracking-wider">
          {displaySignal.text}
        </h1>
      </div>

      <p className="text-center mt-auto text-sm text-slate-400 mb-4">
        {displaySignal.action}
      </p>

      {bestTrade && bestTrade.optimalParams && (
        <div className="text-xs text-gray-400 mt-2 text-center">
          🎛️ 最適化済み: Buy閾値 {bestTrade.optimalParams.buyThreshold}%
        </div>
      )}

      {scanningSymbol && currentAnalysis && (
        <button
          className={`w-full mt-4 px-4 py-2 rounded-md font-medium transition-colors text-sm flex items-center justify-center gap-2
            ${isInWatchlist
              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500/20'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
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

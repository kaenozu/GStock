'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Zap, Play, Pause, Layers, FlaskConical } from 'lucide-react';
import styles from './page.module.css';
<<<<<<< Updated upstream
import { ChartSettings, DisplaySignal, ChartMarker } from '@/types/market';
=======
import { DisplaySignal } from '@/types/market';
>>>>>>> Stashed changes
import { CONFIDENCE_THRESHOLD, MONITOR_LIST } from '@/config/constants';

// Hooks
import { useScanning } from '@/hooks/useScanning';
import { usePersistence } from '@/hooks/usePersistence';
import { useAnalysis } from '@/hooks/useAnalysis';

// Components
import { SignalCard } from '@/components/dashboard/SignalCard';
import { NeuralMonitor } from '@/components/dashboard/NeuralMonitor';
import { HistoryPanel } from '@/components/dashboard/HistoryPanel';
import { WatchList } from '@/components/dashboard/WatchList';
import { TradingPanel } from '@/components/dashboard/TradingPanel';
import { BacktestPanel } from '@/components/dashboard/BacktestPanel';
import { FinancialsPanel } from '@/components/dashboard/FinancialsPanel';
import { EarningsPanel } from '@/components/dashboard/EarningsPanel';
import { AccuracyPanel } from '@/components/dashboard/AccuracyPanel';
import { PortfolioManager } from '@/components/portfolio/PortfolioManager';
import { VirtualScroll } from '@/components/common/VirtualScroll';
import { SettingsPanel } from '@/components/common/SettingsPanel';


const StockChart = dynamic(() => import('@/components/charts/StockChart'), { ssr: false });

export default function Home() {
  const [isPaused, setIsPaused] = useState(false);
  const [earningsMarkers, setEarningsMarkers] = useState<ChartMarker[]>([]);

  const {
    watchlist, setWatchlist,
    history, setHistory,
    executionMode, setExecutionMode
  } = usePersistence();

  const isLive = executionMode === 'LIVE';

  const {
    bestTrade,
    showIndicators,
    setShowIndicators,
    updateBestTrade,
    chartSettings,
    deepReport,
    isBacktestLoading,
    runDeepBacktest,
    setDeepReport
  } = useAnalysis();

  const { scanningSymbol, isScanLoading } = useScanning(
    isPaused,
    updateBestTrade,
    (item) => setHistory(prev => [item, ...prev.slice(0, 99)])
  );

  const currentAnalysis = useMemo(() => {
    if (bestTrade && bestTrade.history) {
      return {
        ...bestTrade,
        history: bestTrade.history.slice(-200) // Last 200 data points for chart
      };
    }
    return null;
  }, [bestTrade]);

  // Derived Signal Logic
  const displaySignal: DisplaySignal = useMemo(() => {
    if (isPaused) return { type: 'HOLD', text: '一時停止', action: 'スキャン一時停止中' };
    if (!bestTrade) return { type: 'HOLD', text: 'スキャン中', action: '市場を分析中...' };

    const buyThreshold = bestTrade.optimalParams?.buyThreshold ?? CONFIDENCE_THRESHOLD;

    if (bestTrade.confidence >= buyThreshold) {
      const isBullish = bestTrade.sentiment === 'BULLISH';
      return {
        type: isBullish ? 'BUY' : 'SELL',
        text: isBullish ? '強い買い' : '強い売り',
        action: isBullish
          ? `信頼度 ${bestTrade.confidence}% (> ${buyThreshold}%)。上昇余地あり。`
          : `信頼度 ${bestTrade.confidence}% (> ${buyThreshold}%)。下落リスク高。`
      };
    } else {
      return {
        type: 'HOLD',
        text: '様子見',
        action: `信頼度 ${bestTrade.confidence}% < 閾値 ${buyThreshold}%。セットアップ待ち。`
      };
    }
  }, [bestTrade, isPaused]);

  // Handler for Earnings dates -> Chart markers
  const handleEarningsDates = (dates: string[]) => {
    const markers: ChartMarker[] = dates.map((date, i) => ({
      time: date,
      position: 'aboveBar',
      color: i === 0 ? '#f59e0b' : '#6366f1', // First is next earnings (amber), rest are past (indigo)
      shape: 'circle',
      text: i === 0 ? '📅 次回決算' : '📊',
      size: i === 0 ? 2 : 1,
    }));
    setEarningsMarkers(markers);
  };

  // Handler for Watchlist Toggle
  const handleToggleWatchlist = (symbol: string, price: number, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => {
    if (watchlist.some(item => item.symbol === symbol)) {
      setWatchlist(watchlist.filter(item => item.symbol !== symbol));
    } else {
      setWatchlist([...watchlist, { symbol, price, changePercent: 0, sentiment: sentiment }]);
    }
  };

  return (
    <main className={`${styles.main} ${isLive ? styles.liveModeActive : ''}`}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.title}>
            <Zap className={styles.icon} />
            <h1>GStock Prime {isLive && <span style={{ color: '#ef4444', fontSize: '0.6rem', verticalAlign: 'top', border: '1px solid #ef4444', padding: '2px 4px', borderRadius: '4px', marginLeft: '4px' }}>LIVE</span>}</h1>
          </div>
          <div className={styles.controls}>
            {/* Mode Switch */}
            <button
              onClick={() => {
                if (!isLive && !confirm("CAUTION: Enabling LIVE mode will connect to real brokerage (simulated logic for now). Proceed?")) return;
                setExecutionMode(isLive ? 'PAPER' : 'LIVE');
              }}
              style={{
                background: isLive ? '#ef4444' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${isLive ? '#ef4444' : '#10b981'}`,
                color: isLive ? '#fff' : '#10b981',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginRight: '1rem'
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#fff' : '#10b981', boxShadow: isLive ? '0 0 10px #fff' : 'none' }}></div>
              {isLive ? '本番稼働' : '模擬取引'}
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`${styles.button} ${isPaused ? styles.paused : ''} `}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              {isPaused ? '再開' : '停止'}
            </button>
            <button
              onClick={() => setShowIndicators(!showIndicators)}
              className={`${styles.button} ${showIndicators ? styles.active : ''} `}
            >
              <Layers size={16} />
              指標
            </button>
            <SettingsPanel />
          </div>
        </header>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Left Panel */}
          <div className={styles.leftPanel}>
            <NeuralMonitor
              analysis={currentAnalysis}
              isPaused={isPaused}
              confidence={currentAnalysis?.confidence || 0}
            />

            <SignalCard
              scanningSymbol={scanningSymbol}
              isScanLoading={isScanLoading}
              isPaused={isPaused}
              currentAnalysis={currentAnalysis}
              displaySignal={displaySignal}
              bestTrade={bestTrade}
              isInWatchlist={watchlist.some(item => item.symbol === scanningSymbol)}
              onToggleWatchlist={handleToggleWatchlist}
            >
              {/* Backtest Integration */}
              {!deepReport && bestTrade && (
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => runDeepBacktest(bestTrade.symbol || scanningSymbol || '', '1y')}
                    disabled={isBacktestLoading}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-cyan)',
                      padding: '8px 16px', borderRadius: '20px', color: 'var(--accent-cyan)',
                      cursor: isBacktestLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                      fontSize: '0.8rem', fontWeight: 600, width: '100%', justifyContent: 'center'
                    }}
                  >
                    <FlaskConical size={14} />
                    {isBacktestLoading ? '分析中...' : 'ディープバックテスト (1年)'}
                  </button>
                </div>
              )}

              {(deepReport || isBacktestLoading) && (
                <BacktestPanel
                  report={deepReport}
                  isLoading={isBacktestLoading}
                  onRunBacktest={(period) => {
                    if (!period) setDeepReport(null);
                    else runDeepBacktest(bestTrade?.symbol || scanningSymbol || '', period);
                  }}
                />
              )}
            </SignalCard>
          </div>

          {/* Center Panel */}
          <div className={styles.centerPanel}>
            {currentAnalysis?.history && (
              <StockChart
                data={currentAnalysis.history}
                indicators={showIndicators ? currentAnalysis.chartIndicators : undefined}
                markers={earningsMarkers}
                settings={chartSettings}
              />
            )}
          </div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            <WatchList
              watchlist={watchlist}
              allSymbols={MONITOR_LIST}
              onSelectSymbol={(symbol) => {
                // Optional: Can implement manual select logic here by adding handleSelectSymbol to component props or context
                console.log('Select', symbol);
              }}
              onToggleWatch={(symbol) => { // Manual add via text input support
                handleToggleWatchlist(symbol, 0, 'NEUTRAL');
              }}
            />

            <HistoryPanel
              history={history}
            />

            <TradingPanel
              symbol={currentAnalysis?.symbol || ''}
              currentPrice={currentAnalysis?.stats?.price || 0}
              executionMode={executionMode}
            />

            <FinancialsPanel symbol={currentAnalysis?.symbol || ''} />

<<<<<<< Updated upstream
            <EarningsPanel 
              symbol={currentAnalysis?.symbol || ''}
              onEarningsDates={handleEarningsDates}
            />

            <AccuracyPanel
              currentSymbol={currentAnalysis?.symbol}
              currentPrice={currentAnalysis?.stats?.price}
              currentPrediction={currentAnalysis ? {
                direction: currentAnalysis.sentiment,
                confidence: currentAnalysis.confidence,
                regime: currentAnalysis.marketRegime,
              } : undefined}
            />

            <PortfolioManager />
=======
            <EarningsPanel symbol={currentAnalysis?.symbol || ''} />
>>>>>>> Stashed changes
          </div >
        </div >
      </div >
    </main >
  );
}
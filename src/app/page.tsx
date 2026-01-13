'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { FlaskConical, BarChart3, TrendingUp, Settings } from 'lucide-react';
import styles from './page.module.css';
import { DisplaySignal, ChartMarker } from '@/types/market';
import { CONFIDENCE_THRESHOLD, MONITOR_LIST } from '@/config/constants';

// Hooks
import { useScanning } from '@/hooks/useScanning';
import { usePersistence } from '@/hooks/usePersistence';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useRealtimePrice } from '@/hooks/useRealtimePrice';
import { useModalSystem } from '@/hooks/useModalSystem';
import { useEarningsData } from '@/hooks/useEarningsData';

// Components
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SignalCard } from '@/components/dashboard/SignalCard';
import { NeuralMonitor } from '@/components/dashboard/NeuralMonitor';
import { HistoryPanel } from '@/components/dashboard/HistoryPanel';
import { WatchList } from '@/components/dashboard/WatchList';
import { TradingPanel } from '@/components/dashboard/TradingPanel';
import { BacktestPanel } from '@/components/dashboard/BacktestPanel';
import { FinancialsPanel } from '@/components/dashboard/FinancialsPanel';
import { EarningsPanel } from '@/components/dashboard/EarningsPanel';
import { AccuracyPanel } from '@/components/dashboard/AccuracyPanel';
import { AlertSettingsPanel } from '@/components/dashboard/AlertSettingsPanel';
import { PortfolioManager } from '@/components/portfolio/PortfolioManager';
import { TabPanel } from '@/components/common/TabPanel';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { OnboardingTour } from '@/components/common/OnboardingTour';

import { MobileNav, MobileTab } from '@/components/layout/MobileNav';

const StockChart = dynamic(() => import('@/components/charts/StockChart'), { ssr: false });

export default function Home() {
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [earningsMarkers, setEarningsMarkers] = useState<ChartMarker[]>([]);

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<MobileTab>('signal');
  // Right Panel Tab State (Controlled)
  const [rightPanelTab, setRightPanelTab] = useState<string>('market');

  // Custom Hooks
  const { modalConfig, openModal, closeModal } = useModalSystem();

  // Handle Mobile Tab Changes
  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'market') setRightPanelTab('market');
    if (tab === 'trade') setRightPanelTab('trade');
  };

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
    setDeepReport,
    runOptimization,
    isOptimizing,
    optimizationResults
  } = useAnalysis();

  // Handler for Auto-Trading Execution
  const handleAutoTrade = useMemo(() => {
    return async (request: any) => {
      try {
        const response = await fetch('/api/trade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-execution-mode': executionMode
          },
          body: JSON.stringify(request)
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Trade failed');
        }
        return await response.json();
      } catch (error: any) {
        throw new Error(error.message || 'Trade request failed');
      }
    };
  }, [executionMode]);

  const { scanningSymbol, isScanLoading } = useScanning(
    isPaused,
    updateBestTrade,
    (item) => setHistory(prev => [item, ...prev.slice(0, 99)]),
    isAutoTrading,
    handleAutoTrade
  );

  // WebSocket Data
  const {
    prices: realtimePrices,
    status: wsStatus,
    error: wsError,
    subscribe: wsSubscribe,
    isEnabled: wsEnabled,
  } = useRealtimePrice();

  React.useEffect(() => {
    if (scanningSymbol && wsEnabled) {
      wsSubscribe(scanningSymbol);
    }
  }, [scanningSymbol, wsEnabled, wsSubscribe]);

  const currentAnalysis = useMemo(() => {
    if (bestTrade && bestTrade.history) {
      return {
        ...bestTrade,
        history: bestTrade.history.slice(-200)
      };
    }
    return null;
  }, [bestTrade]);

  // Earnings Data Hook
  const { nextEarningsDate, earningsTooltip } = useEarningsData(currentAnalysis?.symbol || scanningSymbol || undefined);

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

  const handleToggleWatchlist = (symbol: string, price: number, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => {
    if (watchlist.some(item => item.symbol === symbol)) {
      setWatchlist(watchlist.filter(item => item.symbol !== symbol));
    } else {
      setWatchlist([...watchlist, { symbol, price, changePercent: 0, sentiment }]);
    }
  };

  // handlers for Header
  const onToggleLive = () => {
    if (!isLive) {
      openModal({
        title: 'Activate LIVE Mode?',
        message: 'CAUTION: Enabling LIVE mode will connect to real brokerage APIs (simulated logic for now). Parameters will be reset. Proceed?',
        variant: 'danger',
        onConfirm: () => {
          setExecutionMode('LIVE');
          closeModal();
        }
      });
    } else {
      setExecutionMode('PAPER');
    }
  };

  const onToggleAuto = () => {
    if (!isAutoTrading) {
      openModal({
        title: 'Enable Auto-Trading?',
        message: 'WARNING: Enabling Auto-Trading will execute trades automatically based on AI signals. Ensure you are in PAPER mode or fully understand the risks.',
        variant: 'warning',
        onConfirm: () => {
          setIsAutoTrading(true);
          closeModal();
        }
      });
    } else {
      setIsAutoTrading(false);
    }
  };

  return (
    <ErrorBoundary>
      <main className={`${styles.main} ${isLive ? styles.liveModeActive : ''} ${isAutoTrading ? styles.autoModeActive : ''}`}>
        <div className={styles.container}>
          <DashboardHeader
            isLive={isLive}
            isPaused={isPaused}
            isAutoTrading={isAutoTrading}
            showIndicators={showIndicators}
            wsEnabled={wsEnabled}
            wsStatus={wsStatus}
            wsError={wsError}
            onToggleLive={onToggleLive}
            onTogglePaused={() => setIsPaused(!isPaused)}
            onToggleIndicators={() => setShowIndicators(!showIndicators)}
            onToggleAuto={onToggleAuto}
          />

          {/* Main Content */}
          <div className={styles.content}>
            {/* Left Panel */}
            <div
              className={styles.leftPanel}
              data-mobile-active={mobileTab === 'signal'}
            >
              <div id="tour-neural-monitor">
                <NeuralMonitor
                  analysis={currentAnalysis}
                  isPaused={isPaused}
                  confidence={currentAnalysis?.confidence || 0}
                />
              </div>

              <div id="tour-signal-card">
                <SignalCard
                  scanningSymbol={scanningSymbol}
                  isScanLoading={isScanLoading}
                  isPaused={isPaused}
                  currentAnalysis={currentAnalysis}
                  displaySignal={displaySignal}
                  bestTrade={bestTrade}
                  isInWatchlist={watchlist.some(item => item.symbol === scanningSymbol)}
                  onToggleWatchlist={handleToggleWatchlist}
                  realtimePrice={scanningSymbol ? realtimePrices[scanningSymbol] : null}
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
                      onRunBacktest={(period, config) => {
                        if (!period) setDeepReport(null);
                        else runDeepBacktest(bestTrade?.symbol || scanningSymbol || '', period, config);
                      }}
                      onRunOptimization={runOptimization}
                      isOptimizing={isOptimizing}
                      optimizationResults={optimizationResults}
                      scanningSymbol={bestTrade?.symbol || scanningSymbol || ''}
                    />
                  )}
                </SignalCard>
              </div>
            </div>

            {/* Center Panel */}
            <div
              className={styles.centerPanel}
              data-mobile-active={mobileTab === 'chart'}
            >
              {currentAnalysis?.history && (
                <div id="tour-chart-panel" className="w-full h-full">
                  <StockChart
                    data={currentAnalysis.history}
                    indicators={showIndicators ? currentAnalysis.chartIndicators : undefined}
                    markers={earningsMarkers}
                    settings={chartSettings}
                    earningsDate={nextEarningsDate}
                    earningsTooltip={earningsTooltip}
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Tabbed */}
            <div
              className={styles.rightPanel}
              data-mobile-active={mobileTab === 'market' || mobileTab === 'trade'}
            >
              <TabPanel
                tabs={[
                  { id: 'market', label: 'Market', icon: <BarChart3 size={16} /> },
                  { id: 'trade', label: 'Trade', icon: <TrendingUp size={16} /> },
                  { id: 'settings', label: 'Config', icon: <Settings size={16} /> },
                ]}
                activeTab={rightPanelTab}
                onTabChange={setRightPanelTab}
              >
                {/* Market Tab */}
                <>
                  <WatchList
                    watchlist={watchlist}
                    allSymbols={MONITOR_LIST}
                    onSelectSymbol={(symbol) => {
                      // Symbol selected from watchlist - could trigger analysis
                    }}
                    onToggleWatch={(symbol) => {
                      handleToggleWatchlist(symbol, 0, 'NEUTRAL');
                    }}
                  />
                  <HistoryPanel history={history} />
                  <FinancialsPanel symbol={currentAnalysis?.symbol || ''} />
                  <EarningsPanel symbol={currentAnalysis?.symbol || ''} />
                </>

                {/* Trade Tab */}
                <>
                  <TradingPanel
                    symbol={currentAnalysis?.symbol || ''}
                    currentPrice={currentAnalysis?.stats?.price || 0}
                    executionMode={executionMode}
                  />
                  <PortfolioManager />
                  <AccuracyPanel
                    currentSymbol={currentAnalysis?.symbol}
                    currentPrice={currentAnalysis?.stats?.price}
                    currentPrediction={currentAnalysis ? {
                      direction: currentAnalysis.sentiment,
                      confidence: currentAnalysis.confidence,
                      regime: currentAnalysis.marketRegime,
                    } : undefined}
                  />
                </>

                {/* Settings Tab */}
                <>
                  <AlertSettingsPanel />
                </>
              </TabPanel>
            </div>
          </div>

          <MobileNav activeTab={mobileTab} onTabChange={handleMobileTabChange} />

          <ConfirmationModal
            isOpen={modalConfig.isOpen}
            title={modalConfig.title}
            message={modalConfig.message}
            onConfirm={modalConfig.onConfirm}
            onCancel={closeModal}
            variant={modalConfig.variant}
          />

          <OnboardingTour />
        </div>
      </main>
    </ErrorBoundary>
  );
}
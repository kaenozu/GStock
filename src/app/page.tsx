'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { fetchStockData } from '@/lib/api/alphavantage';
import { calculateAdvancedPredictions } from '@/lib/api/prediction-engine';
import { runBacktest, findOptimalStrategy } from '@/lib/api/backtest';
import { TrendingUp, TrendingDown, Minus, Zap, Search, Target, History, AlertCircle, CheckCircle2, Star, Play, Pause, FlaskConical, Layers, Globe } from 'lucide-react';
import styles from './page.module.css';
import { MONITOR_LIST, SCAN_INTERVAL_MS, DATA_REFRESH_INTERVAL_MS, CONFIDENCE_THRESHOLD } from '@/config/constants';
import { AnalysisResult, TradeHistoryItem, DisplaySignal, TradeType, WatchListItem, BacktestResult, ChartSettings } from '@/types/market';

const StockChart = dynamic(() => import('@/components/charts/StockChart'), { ssr: false });

export default function Home() {
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [bestTrade, setBestTrade] = useState<AnalysisResult | null>(null);

  // currentAnalysis は派生データとして計算（Stateにしない）
  // history は副作用として更新が必要

  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchListItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    showSMA20: true,
    showSMA50: true,
    showBollingerBands: true,
    showPredictions: true,
  });

  // 永続化データの読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Watchlist
      const savedWatchlist = localStorage.getItem('gstock-watchlist');
      if (savedWatchlist) {
        try {
          setTimeout(() => setWatchlist(JSON.parse(savedWatchlist)), 0);
        } catch (e) {
          console.error('Failed to parse watchlist', e);
        }
      }
      
      // History
      const savedHistory = localStorage.getItem('gstock-history');
      if (savedHistory) {
        try {
          setTimeout(() => setHistory(JSON.parse(savedHistory)), 0);
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
    }
  }, []);

  // ウォッチリストの永続化: 変更時に保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gstock-watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist]);

  // 履歴の永続化: 変更時に保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gstock-history', JSON.stringify(history));
    }
  }, [history]);

  // 銘柄を定期的に巡回スキャンする
  useEffect(() => {
    if (isPaused) return;

    const scanInterval = setInterval(() => {
      // スキャン対象が変わるタイミングでバックテスト結果をリセット
      setBacktestResult(null);
      setCurrentScanIndex((prev) => (prev + 1) % MONITOR_LIST.length);
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(scanInterval);
  }, [isPaused]);

  const scanningSymbol = MONITOR_LIST[currentScanIndex];

  const { data: stockData, isLoading: isScanLoading } = useSWR(
    `scan-${scanningSymbol}`,
    () => fetchStockData(scanningSymbol),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      focusThrottleInterval: 60000,
      refreshInterval: DATA_REFRESH_INTERVAL_MS
    }
  );

  // 派生データの計算（自己最適化ロジックの実行）
  const currentAnalysis = useMemo(() => {
    console.log('StockData Check:', stockData ? stockData.length : 'No Data');
    if (stockData && stockData.length > 50) {
        const analysis = calculateAdvancedPredictions(stockData);
        
        // --- G-Engine AI Self-Optimization ---
        // この銘柄に最適な閾値を探索（全自動チューニング）
        const { params, result } = findOptimalStrategy(stockData);
        
        console.log(`Optimization for ${scanningSymbol}: Buy>${params.buyThreshold}%, Exp.Profit:${result.profitPercent}%`);

        return {
            symbol: scanningSymbol,
            ...analysis,
            price: stockData[stockData.length - 1].close,
            optimalParams: params,
            optimalProfit: result.profitPercent,
            optimalWinRate: result.winRate
        };
    }
    return null;
  }, [stockData, scanningSymbol]);

  // ベストトレードの更新（副作用）
  useEffect(() => {
    if (currentAnalysis) {
      setTimeout(() => {
        setBestTrade({
          ...currentAnalysis,
          history: stockData,
          isRealtime: stockData && stockData[0] ? stockData[0].time.includes('-') : false
        });
      }, 0);
    }
  }, [currentAnalysis, stockData]);

  // シグナル履歴の更新（最適化された閾値を使用）
  useEffect(() => {
    const buyThreshold = bestTrade?.optimalParams?.buyThreshold ?? CONFIDENCE_THRESHOLD;

    if (bestTrade && (bestTrade.confidence >= buyThreshold)) {
      const type: TradeType = bestTrade.sentiment === 'BULLISH' ? 'BUY' : 'SELL';

      const newEntry: TradeHistoryItem = {
        symbol: bestTrade.symbol || '',
        type,
        time: new Date().toLocaleTimeString(),
        confidence: bestTrade.confidence
      };

      setTimeout(() => {
        setHistory(prev => {
          // 重複チェック
          if (prev.length > 0 && prev[0].symbol === newEntry.symbol && prev[0].type === newEntry.type) return prev;
          return [newEntry, ...prev].slice(0, 5);
        });
      }, 0);
    }
  }, [bestTrade]);

  // 現在表示すべき「指示」（最適化された閾値を使用）
  const displaySignal: DisplaySignal = useMemo(() => {
    if (isPaused) return { type: 'HOLD', text: '一時停止中', action: 'スキャンを停止しています' };
    if (!bestTrade) return { type: 'HOLD', text: '市場スキャン中...', action: 'チャンスを探しています' };

    // AIが導き出した最適閾値を使用（なければデフォルト）
    const buyThreshold = bestTrade.optimalParams?.buyThreshold ?? CONFIDENCE_THRESHOLD;

    if (bestTrade.confidence >= buyThreshold) {
      const isBullish = bestTrade.sentiment === 'BULLISH';
      return {
        type: isBullish ? 'BUY' : 'SELL',
        text: isBullish ? `${bestTrade.symbol} を今すぐ買う` : `${bestTrade.symbol} を今すぐ売る`,
        action: isBullish
          ? `AI判定: 信頼度${bestTrade.confidence}% (基準値${buyThreshold}%クリア)。強い上昇シグナルです。`
          : '下落の予兆です。保有株は売却し、空売りでの利益を狙えます。'
      };
    } else {
      // 閾値未満
      return {
        type: 'HOLD',
        text: `分析中: ${bestTrade.symbol} (Wait)`,
        action: `現在の信頼度(${bestTrade.confidence}%) < 最適基準値(${buyThreshold}%)\nAIが導き出したこの銘柄の必勝パターンを待っています。`
      };
    }
  }, [bestTrade, isPaused]);

  const toggleWatchlist = (symbol: string, price: number, sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => {
    setWatchlist(prev => {
      if (prev.find(item => item.symbol === symbol)) {
        return prev.filter(item => item.symbol !== symbol);
      }
      return [...prev, { symbol, price, sentiment }];
    });
  };

  const handleBacktest = () => {
    if (bestTrade?.history) {
      // BacktestResult の計算（既に最適化済みパラメータがあればそれを使う）
      // 再度 findOptimalStrategy を呼ぶ必要はないが、もしボタン押下時にも再計算したいなら呼んでも良い
      // ここでは最適化された設定での結果を表示する
      const { result } = findOptimalStrategy(bestTrade.history);
      setBacktestResult(result);
      setIsPaused(true); // 結果をゆっくり見るために一時停止
    }
  };

  const isInWatchlist = watchlist.some(item => item.symbol === scanningSymbol);

  return (
    <div className={styles.autoContainer}>
      <div className={`${styles.backgroundGlow} ${styles[`bg${displaySignal.type}`]}`}></div>

      <div className={styles.topBar}>
        <div className={styles.logo}>
          <Zap size={24} fill="var(--accent-cyan)" />
          <span>GSTOCK PRIME</span>
        </div>

        <div className={styles.scanningStatus}>
          {isPaused ? <Pause size={16} className={styles.pausedDot} /> : <Search size={16} className={styles.scanIcon} />}
          <span>{isPaused ? '一時停止' : `市場監視中: ${scanningSymbol}`}</span>
          {!isPaused && (
            <div className={styles.scanProgress}>
              <div className={styles.scanProgressBar} style={{ width: `${((currentScanIndex + 1) / MONITOR_LIST.length) * 100}%` }}></div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} />}
        </button>

        <div className={styles.liveIndicator}>
          <div className={`${styles.liveDot} ${isPaused ? styles.pausedDot : ''}`}></div>
          <span>全自動モード</span>
        </div>
      </div>

      <main className={styles.mainContent}>
        <div className={`${styles.signalCard} ${styles[`signal${displaySignal.type}`]}`}>
          {/* 現在分析中の生データ表示 */}
          <div className={styles.liveAnalysisStrip}>
            <div className={styles.liveLabel}>現在分析中: {scanningSymbol}</div>
            <div className={styles.liveStats}>
              <span>RSI: {currentAnalysis?.stats?.rsi || '--'}</span>
              <span>TREND: {currentAnalysis?.stats?.trend || '--'}</span>
              <span>VOL: {currentAnalysis?.stats?.adx || '--'}</span>
            </div>

            <button
              onClick={() => currentAnalysis && toggleWatchlist(scanningSymbol, currentAnalysis.stats.price, currentAnalysis.sentiment)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
            >
              <Star
                size={18}
                fill={isInWatchlist ? "#fbbf24" : "none"}
                color={isInWatchlist ? "#fbbf24" : "var(--text-muted)"}
              />
            </button>

            {isScanLoading && !isPaused && <div className={styles.loadingDot}></div>}
          </div>

          <div className={styles.signalLabel}>
            <Target size={14} style={{ marginRight: 8 }} />
            AI最適化シグナル
          </div>

          <div className={styles.signalDisplay}>
            {displaySignal.type === 'BUY' && <TrendingUp size={120} className={styles.signalIcon} />}
            {displaySignal.type === 'SELL' && <TrendingDown size={120} className={styles.signalIcon} />}
            {displaySignal.type === 'HOLD' && <Minus size={120} className={styles.signalIcon} />}

            <h1 className={styles.signalText}>{displaySignal.text}</h1>
          </div>
          
          {/* 最適化情報の表示（デバッグ・信頼感向上用） */}
          {bestTrade?.optimalParams && (
             <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
               AI最適化済み: Buy閾値 {bestTrade.optimalParams.buyThreshold}% / 期待益 {bestTrade.optimalProfit}%
             </div>
          )}

          {bestTrade?.history && (
            <div className={styles.chartContainer}>
              <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                 <button 
                   onClick={() => setShowIndicators(!showIndicators)}
                   style={{ 
                     background: showIndicators ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', 
                     color: showIndicators ? '#000' : '#fff',
                     border: 'none', 
                     borderRadius: '4px', 
                     padding: '4px 8px', 
                     cursor: 'pointer',
                     fontSize: '0.7rem',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     fontWeight: 600
                   }}
                 >
                   <Layers size={12} /> {showIndicators ? '設定を隠す' : 'チャート設定'}
                 </button>
                 
                 {showIndicators && (
                   <div style={{
                     background: 'rgba(0,0,0,0.8)',
                     border: '1px solid rgba(255,255,255,0.1)',
                     borderRadius: '8px',
                     padding: '8px',
                     backdropFilter: 'blur(4px)',
                     minWidth: '150px'
                   }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px', cursor: 'pointer' }}>
                       <input 
                         type="checkbox" 
                         checked={chartSettings.showSMA20} 
                         onChange={(e) => setChartSettings(prev => ({ ...prev, showSMA20: e.target.checked }))}
                       /> SMA 20 (黄)
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px', cursor: 'pointer' }}>
                       <input 
                         type="checkbox" 
                         checked={chartSettings.showSMA50} 
                         onChange={(e) => setChartSettings(prev => ({ ...prev, showSMA50: e.target.checked }))}
                       /> SMA 50 (青)
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '4px', cursor: 'pointer' }}>
                       <input 
                         type="checkbox" 
                         checked={chartSettings.showBollingerBands} 
                         onChange={(e) => setChartSettings(prev => ({ ...prev, showBollingerBands: e.target.checked }))}
                       /> ボリンジャーバンド
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                       <input 
                         type="checkbox" 
                         checked={chartSettings.showPredictions} 
                         onChange={(e) => setChartSettings(prev => ({ ...prev, showPredictions: e.target.checked }))}
                       /> AI予測ライン (水色)
                     </label>
                   </div>
                 )}
              </div>
              <StockChart 
                data={bestTrade.history} 
                predictionData={bestTrade.predictions} 
                indicators={bestTrade.chartIndicators}
                markers={backtestResult?.markers}
                settings={chartSettings}
              />
            </div>
          )}

          <p className={styles.actionInstruction}>{displaySignal.action}</p>

          {!backtestResult && bestTrade && (
            <button
              onClick={handleBacktest}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto 1.5rem',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <FlaskConical size={14} /> バックテストを実行 (Beta)
            </button>
          )}

          {backtestResult && (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '1.5rem',
              borderRadius: '16px',
              marginBottom: '2rem',
              border: '1px solid var(--accent-cyan)',
              width: '100%'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FlaskConical size={14} /> バックテスト結果 (過去100日)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>純利益</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: backtestResult.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    {backtestResult.profit >= 0 ? '+' : ''}{backtestResult.profitPercent}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>勝率</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
                    {backtestResult.winRate}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>トレード数</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    {backtestResult.trades}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>最終残高</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    ${backtestResult.finalBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPaused && !backtestResult && (
            <button className={styles.resumeButton} onClick={() => setIsPaused(false)}>
              スキャンを再開
            </button>
          )}

          {!isPaused && bestTrade?.signals && bestTrade.signals.length > 0 && (
            <div className={styles.reasoningSection}>
              <div className={styles.reasoningTitle}>AIの判断根拠</div>
              <ul className={styles.reasoningList}>
                {bestTrade.signals.slice(0, 3).map((sig: string, i: number) => (
                  <li key={i} className={styles.reasoningItem}>
                    <CheckCircle2 size={14} className={styles.reasonIcon} />
                    {sig}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.confidenceMeter}>
            <div className={styles.meterText}>AI信頼度: {bestTrade?.confidence || 0}%</div>
            <div className={styles.meterTrack}>
              <div
                className={styles.meterBar}
                style={{
                  width: `${bestTrade?.confidence || 0}%`,
                  background: displaySignal.type === 'BUY' ? '#10b981' : displaySignal.type === 'SELL' ? '#ef4444' : 'var(--accent-cyan)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* ウォッチリストセクション */}
        {watchlist.length > 0 && (
          <div className={styles.watchlistContainer}>
            <div className={styles.watchlistTitle}>
              <Star size={12} fill="currentColor" /> ウォッチリスト
            </div>
            <div className={styles.watchlistGrid}>
              {watchlist.map((item) => (
                <div key={item.symbol} className={styles.watchItem} onClick={() => {
                  // クリックでその銘柄にジャンプ
                  const idx = MONITOR_LIST.indexOf(item.symbol);
                  if (idx >= 0) {
                    setBacktestResult(null); // 明示的にリセット
                    setCurrentScanIndex(idx);
                    setIsPaused(true); // 詳細を見るために一時停止
                  }
                }}>
                  <div className={styles.watchSymbol}>{item.symbol}</div>
                  <div className={styles.watchStats}>
                    <span>${item.price.toFixed(2)}</span>
                    <span className={item.sentiment === 'BULLISH' ? styles.bullText : item.sentiment === 'BEARISH' ? styles.bearText : ''}>
                      {item.sentiment === 'BULLISH' ? '▲' : item.sentiment === 'BEARISH' ? '▼' : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 全銘柄一覧パネル (Global Market List) */}
        <div className={styles.allStocksContainer}>
          <div className={styles.allStocksHeader}>
            <Globe size={14} /> 全監視銘柄リスト (クリックで即分析)
          </div>
          <div className={styles.allStocksGrid}>
            {MONITOR_LIST.map((symbol) => {
              const isWatched = watchlist.some(w => w.symbol === symbol);
              return (
                <div key={symbol} className={styles.stockCard}>
                  <div
                    className={styles.stockName}
                    onClick={() => {
                      const idx = MONITOR_LIST.indexOf(symbol);
                      if (idx >= 0) {
                        setBacktestResult(null);
                        setCurrentScanIndex(idx);
                        setIsPaused(true);
                      }
                    }}
                  >
                    {symbol}
                  </div>
                  <button
                    className={`${styles.addWatchButton} ${isWatched ? styles.watched : ''}`}
                    onClick={() => {
                      // priceやsentimentは仮または取得済みデータがあれば使うが、
                      // ここではシンプルにリスト登録のみ行う（データは次回のスキャン等で更新される）
                      // ただし toggleWatchlist は引数が必要なので、簡易的に現在の price などを渡すか、
                      // 既存の toggleWatchlist を調整するか。
                      // ここでは既存の toggleWatchlist を呼ぶために、
                      // 現在表示中のデータがあればそれを、なければ0を入れておく（後で更新される想定）
                      toggleWatchlist(symbol, 0, 'NEUTRAL');
                    }}
                  >
                    <Star size={14} fill={isWatched ? "currentColor" : "none"} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {history.length > 0 && (
          <div className={styles.historySection}>
            <div className={styles.historyTitle}>
              <History size={14} /> 最近のスキャン履歴
            </div>
            <div className={styles.historyList}>
              {history.map((item, idx) => (
                <div key={idx} className={styles.historyItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`${styles.historyTag} ${styles[`tag${item.type}`]}`}>{item.type}</span>
                    <strong>{item.symbol}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {item.time} | 確信度: {item.confidence}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bestTrade && !isPaused && (
          <div className={styles.tradeDetailInfo}>
            <div className={styles.detailItem}>
              <span>銘柄</span>
              <strong>{bestTrade.symbol}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>現在価格</span>
              <strong>${(bestTrade.price || 0).toFixed(2)}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>データ品質</span>
              <span className={bestTrade.isRealtime ? styles.realBadge : styles.simBadge}>
                {bestTrade.isRealtime ? 'リアルタイム' : 'シミュレーション'}
              </span>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.autoFooter}>
        <div className={styles.footerNote}>
          <AlertCircle size={14} />
          <span>人間はAIの指示に従って証券口座で注文を出すだけです。分析はすべて完了しています。</span>
        </div>
      </footer>
    </div>
  );
}

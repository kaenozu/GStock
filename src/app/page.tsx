'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { fetchStockData } from '@/lib/api/alphavantage';
import { calculateAdvancedPredictions } from '@/lib/api/prediction-engine';
import { TrendingUp, TrendingDown, Minus, Zap, Search, Target, History, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './page.module.css';
import { MONITOR_LIST, SCAN_INTERVAL_MS, DATA_REFRESH_INTERVAL_MS, CONFIDENCE_THRESHOLD } from '@/config/constants';
import { AnalysisResult, TradeHistoryItem, DisplaySignal, TradeType } from '@/types/market';

const StockChart = dynamic(() => import('@/components/charts/StockChart'), { ssr: false });

export default function Home() {
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [bestTrade, setBestTrade] = useState<AnalysisResult | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);

  // 銘柄を定期的に巡回スキャンする
  useEffect(() => {
    const scanInterval = setInterval(() => {
      setCurrentScanIndex((prev) => (prev + 1) % MONITOR_LIST.length);
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(scanInterval);
  }, []);

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

  useEffect(() => {
    if (stockData && stockData.length > 50) {
      const analysis = calculateAdvancedPredictions(stockData);

      // 今スキャンしている銘柄のリアルタイム分析結果を常にセット
      setCurrentAnalysis({
        symbol: scanningSymbol,
        ...analysis,
        price: stockData[stockData.length - 1].close
      });

      // 信頼度が閾値を超える「本命チャンス」のみを更新
      if (analysis.confidence >= CONFIDENCE_THRESHOLD) {
        setBestTrade({
          symbol: scanningSymbol,
          ...analysis,
          history: stockData, // チャート表示用に履歴データを保存
          price: stockData[stockData.length - 1].close,
          isRealtime: stockData[0].time.includes('-')
        });
      }
    }
  }, [stockData, scanningSymbol]);

  // シグナル履歴の更新
  useEffect(() => {
    if (bestTrade && (bestTrade.confidence >= CONFIDENCE_THRESHOLD)) {
      const type: TradeType = bestTrade.sentiment === 'BULLISH' ? 'BUY' : 'SELL';
      
      const newEntry: TradeHistoryItem = {
        symbol: bestTrade.symbol || '',
        type,
        time: new Date().toLocaleTimeString(),
        confidence: bestTrade.confidence
      };

      setHistory(prev => {
        // 重複チェック（同じ銘柄・同じタイプが連続しないように）
        if (prev.length > 0 && prev[0].symbol === newEntry.symbol && prev[0].type === newEntry.type) return prev;
        return [newEntry, ...prev].slice(0, 5);
      });
    }
  }, [bestTrade]);

  // 現在表示すべき「指示」
  const displaySignal: DisplaySignal = useMemo(() => {
    if (!bestTrade) return { type: 'HOLD', text: '市場スキャン中...', action: 'チャンスを探しています' };

    if (bestTrade.confidence >= CONFIDENCE_THRESHOLD) {
      const isBullish = bestTrade.sentiment === 'BULLISH';
      return {
        type: isBullish ? 'BUY' : 'SELL',
        text: isBullish ? `${bestTrade.symbol} を今すぐ買う` : `${bestTrade.symbol} を今すぐ売る`,
        action: isBullish
          ? '上昇の波が来ています。新規買い（ロング）のタイミングです。'
          : '下落の予兆です。保有株は売却し、空売りでの利益を狙えます。'
      };
    }

    return { type: 'HOLD', text: '異常なし', action: `現在 ${bestTrade?.symbol || '市場'} に明確なシグナルはありません。引き続き全銘柄を監視します。` };
  }, [bestTrade]);

  return (
    <div className={styles.autoContainer}>
      <div className={`${styles.backgroundGlow} ${styles[`bg${displaySignal.type}`]}`}></div>

      <div className={styles.topBar}>
        <div className={styles.logo}>
          <Zap size={24} fill="var(--accent-cyan)" />
          <span>GSTOCK PRIME</span>
        </div>

        <div className={styles.scanningStatus}>
          <Search size={16} className={styles.scanIcon} />
          <span>SCANNING: {scanningSymbol}</span>
          <div className={styles.scanProgress}>
            <div className={styles.scanProgressBar} style={{ width: `${((currentScanIndex + 1) / MONITOR_LIST.length) * 100}%` }}></div>
          </div>
        </div>

        <div className={styles.liveIndicator}>
          <div className={styles.liveDot}></div>
          <span>ULTRA AUTOMATED</span>
        </div>
      </div>

      <main className={styles.mainContent}>
        <div className={`${styles.signalCard} ${styles[`signal${displaySignal.type}`]}`}>
          {/* 現在分析中の生データ表示 */}
          <div className={styles.liveAnalysisStrip}>
            <div className={styles.liveLabel}>ANALYZING: {scanningSymbol}</div>
            <div className={styles.liveStats}>
              <span>RSI: {currentAnalysis?.stats?.rsi || '--'}</span>
              <span>TREND: {currentAnalysis?.stats?.trend || '--'}</span>
              <span>VOL: {currentAnalysis?.stats?.adx || '--'}</span>
            </div>
            {isScanLoading && <div className={styles.loadingDot}></div>}
          </div>

          <div className={styles.signalLabel}>
            <Target size={14} style={{ marginRight: 8 }} />
            AI OPTIMIZED SIGNAL
          </div>

          <div className={styles.signalDisplay}>
            {displaySignal.type === 'BUY' && <TrendingUp size={120} className={styles.signalIcon} />}
            {displaySignal.type === 'SELL' && <TrendingDown size={120} className={styles.signalIcon} />}
            {displaySignal.type === 'HOLD' && <Minus size={120} className={styles.signalIcon} />}

            <h1 className={styles.signalText}>{displaySignal.text}</h1>
          </div>

          {bestTrade?.history && (
            <div className={styles.chartContainer}>
              <StockChart data={bestTrade.history} predictionData={bestTrade.predictions} />
            </div>
          )}

          <p className={styles.actionInstruction}>{displaySignal.action}</p>

          {bestTrade?.signals && bestTrade.signals.length > 0 && (
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
            <div className={styles.meterText}>AI CONFIDENCE: {bestTrade?.confidence || 0}%</div>
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

        {bestTrade && (
          <div className={styles.tradeDetailInfo}>
            <div className={styles.detailItem}>
              <span>TARGET</span>
              <strong>{bestTrade.symbol}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>PRICE</span>
              <strong>${(bestTrade.price || 0).toFixed(2)}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>QA</span>
              <span className={bestTrade.isRealtime ? styles.realBadge : styles.simBadge}>
                {bestTrade.isRealtime ? 'REALTIME' : 'SIMULATED'}
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
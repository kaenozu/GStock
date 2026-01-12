import React from 'react';
import { Brain, Zap, Activity } from 'lucide-react';
import styles from '@/app/page.module.css';
import { AnalysisResult } from '@/types/market';
import { TermWithTooltip } from '@/components/common/Tooltip';

interface NeuralMonitorProps {
    analysis: AnalysisResult | null;
    isPaused: boolean;
    confidence: number;
}

export const NeuralMonitor: React.FC<NeuralMonitorProps> = React.memo(function NeuralMonitor({ analysis, isPaused, confidence }) {
    if (!analysis || isPaused || !analysis.signals) {
        return null;
    }

    // --- Gauge Calculation ---
    // Radius = 40, Circumference = 2 * PI * 40 approx 251.2
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    // We want a 270 degree gauge (3/4 circle), so max visible is 0.75 * circumference
    const maxDash = circumference * 0.75;
    // Value scaling: confidence is 0-100.
    const strokeDashoffset = maxDash - (confidence / 100) * maxDash;

    // Rotation adjust for 270 degree gauge starting bottom-left
    // CSS .gaugeCircle handles rotation (135deg). 
    // Wait, let's keep it simple: Full circle gauge for now or standard dashoffset trick.
    // Let's use standard full circle for simplicity first, or partial if confident.
    // Updating CSS to 135deg rotation and stroke-linecap round.

    const isBullish = analysis.sentiment === 'BULLISH';
    const isBearish = analysis.sentiment === 'BEARISH';
    const sentimentColor = isBullish ? '#10b981' : isBearish ? '#ef4444' : '#94a3b8';

    // --- Factor Calculation (Mock Logic for visualization if raw data missing) ---
    const rsiVal = analysis.stats?.rsi || 50;
    const trendVal = analysis.stats?.adx || 20; // ADX as Trend Strength
    // RSI Status
    let rsiStatus = '中立';
    let rsiColor = 'statusNeutral';
    let rsiBar = 'barNeutral';
    if (rsiVal > 70) { rsiStatus = '買われ過ぎ'; rsiColor = 'statusBearish'; rsiBar = 'barBearish'; }
    else if (rsiVal < 30) { rsiStatus = '売られ過ぎ'; rsiColor = 'statusBullish'; rsiBar = 'barBullish'; }

    // Trend Status
    let trendStatus = '弱い';
    let trendColor = 'statusNeutral';
    let trendBar = 'barNeutral';
    if (trendVal > 25) {
        trendStatus = analysis.stats?.trend === 'UP' ? '強い上昇' : '強い下落';
        trendColor = analysis.stats?.trend === 'UP' ? 'statusBullish' : 'statusBearish';
        trendBar = analysis.stats?.trend === 'UP' ? 'barBullish' : 'barBearish';
    }

    return (
        <div className={styles.neuralContainer}>
            <div className={styles.scanningEffect}></div>

            <div className={styles.neuralHeader}>
                <div className={styles.neuralTitle}>
                    <Brain size={16} /> ニューラルモニター v2.0
                </div>
                <div style={{ fontSize: '0.7rem', color: isPaused ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={12} /> {isPaused ? '一時停止' : 'リアルタイム推論'}
                </div>
            </div>

            <div className={styles.neuralContent}>
                {/* Gauge Section */}
                <div className={styles.gaugeSection}>
                    <svg width="120" height="120" viewBox="0 0 100 100">
                        {/* Background Track */}
                        <circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${maxDash} ${circumference}`}
                            transform="rotate(135 50 50)"
                        />
                        {/* Value Track */}
                        <circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke={sentimentColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${maxDash} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(135 50 50)"
                            className={styles.gaugeValue}
                        />
                    </svg>
                    <div className={styles.gaugeTextContainer}>
                        <div className={styles.gaugeScore} style={{ color: sentimentColor }}>
                            {confidence}
                        </div>
                        <div className={styles.gaugeLabel}><TermWithTooltip term="信頼度">信頼度</TermWithTooltip></div>
                    </div>
                </div>

                {/* Factors Grid */}
                <div className={styles.factorsGrid}>
                    {/* Market Regime (New) */}
                    <div className={styles.factorRow}>
                        <div className={styles.factorHeader}>
                            <span><TermWithTooltip term="市場状態">市場状態</TermWithTooltip></span>
                            <span style={{
                                color: analysis.marketRegime === 'BULL_TREND' ? '#10b981' :
                                    analysis.marketRegime === 'BEAR_TREND' ? '#ef4444' :
                                        analysis.marketRegime === 'VOLATILE' ? '#f59e0b' :
                                            analysis.marketRegime === 'SQUEEZE' ? '#a855f7' : '#94a3b8'
                            }}>
                                {analysis.marketRegime === 'BULL_TREND' ? '上昇トレンド' :
                                 analysis.marketRegime === 'BEAR_TREND' ? '下落トレンド' :
                                 analysis.marketRegime === 'VOLATILE' ? '不安定' :
                                 analysis.marketRegime === 'SQUEEZE' ? 'スクイーズ' :
                                 analysis.marketRegime === 'SIDEWAYS' ? '横ばい' : analysis.marketRegime}
                            </span>
                        </div>
                    </div>

                    {/* RSI Factor */}
                    <div className={styles.factorRow}>
                        <div className={styles.factorHeader}>
                            <span><TermWithTooltip term="RSI">RSI (モメンタム)</TermWithTooltip></span>
                            <span className={styles[rsiColor]}>{rsiVal} / {rsiStatus}</span>
                        </div>
                        <div className={styles.factorBarBg}>
                            <div
                                className={`${styles.factorBarValue} ${styles[rsiBar]}`}
                                style={{ width: `${rsiVal}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Trend Factor */}
                    <div className={styles.factorRow}>
                        <div className={styles.factorHeader}>
                            <span><TermWithTooltip term="ADX">ADX (トレンド強度)</TermWithTooltip></span>
                            <span className={styles[trendColor]}>{trendVal} / {trendStatus}</span>
                        </div>
                        <div className={styles.factorBarBg}>
                            <div
                                className={`${styles.factorBarValue} ${styles[trendBar]}`}
                                style={{ width: `${Math.min(trendVal * 2, 100)}%` }} // ADX is usually 0-50, scale to 100 visual
                            ></div>
                        </div>
                    </div>

                    {/* Council Voice (Top Signal) */}
                    <div className={styles.factorRow} style={{ marginTop: '0.5rem' }}>
                        <div className={styles.factorHeader}>
                            <span><TermWithTooltip term="評議会の声">評議会の声</TermWithTooltip></span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={12} fill="var(--accent-cyan)" color="var(--accent-cyan)" />
                            {analysis.signals.find(s => s.startsWith('Alpha:'))?.replace('Alpha:', 'Alpha (議長):') || analysis.signals[0] || 'AI分析準備中...'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
);
});

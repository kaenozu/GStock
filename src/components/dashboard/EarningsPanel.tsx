'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import styles from '@/app/page.module.css';
import { Skeleton } from '@/components/common/Skeleton';

interface EarningsEvent {
    symbol: string;
    date: string;
    epsEstimate: number | null;
    epsActual: number | null;
    revenueEstimate: number | null;
    revenueActual: number | null;
    hour: 'bmo' | 'amc' | 'dmh';
}

interface EarningsPanelProps {
    symbol: string;
}

// ... types
interface AIAnalysis {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number;
    summary: string;
}

export const EarningsPanel: React.FC<EarningsPanelProps> = ({ symbol }) => {
    const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (!symbol) return;
        setAnalysis(null); // Reset when symbol changes

        const fetchEarnings = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/earnings?symbol=${symbol}`);
                if (!res.ok) throw new Error('決算情報を取得できませんでした');
                const data = await res.json();
                setEarnings(data);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : '予期しないエラーが発生しました');
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [symbol]);

    const runAIAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch('/api/analyze-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol })
            });
            if (!res.ok) throw new Error('AI Analysis failed');
            const data = await res.json();
            setAnalysis(data);
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    if (!symbol) return null;

    if (loading) {
        return (
            <div className={styles.panel} style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} /> Earnings Calendar
                </h3>
                <Skeleton height="2rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton height="2rem" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.panel} style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} /> Earnings Calendar
                </h3>
                <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>
            </div>
        );
    }

    const nextEarnings = earnings.length > 0 ? earnings[0] : null;
    const daysUntil = nextEarnings
        ? Math.ceil((new Date(nextEarnings.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const formatHour = (hour: string) => {
        switch (hour) {
            case 'bmo': return '市場開場前';
            case 'amc': return '市場閉場後';
            case 'dmh': return '取引時間中';
            default: return hour;
        }
    };

    const formatCurrency = (val: number | null) => {
        if (val === null) return '-';
        return val >= 1e9 ? `$${(val / 1e9).toFixed(1)}B` : `$${(val / 1e6).toFixed(0)}M`;
    };

    return (
        <div className={styles.panel} style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: '#f59e0b' }} /> Earnings & AI
                </div>
            </h3>

            {nextEarnings ? (
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                            📅 {nextEarnings.date}
                        </span>
                        <span style={{
                            background: daysUntil !== null && daysUntil <= 7 ? '#ef4444' : '#10b981',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                        }}>
                            {daysUntil !== null ? (daysUntil <= 0 ? 'TODAY' : `${daysUntil} days`) : '-'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                        <Clock size={12} />
                        {formatHour(nextEarnings.hour)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <div>
                            <div style={{ color: '#64748b' }}>EPS Est.</div>
                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {nextEarnings.epsEstimate !== null ? `$${nextEarnings.epsEstimate.toFixed(2)}` : '-'}
                                {nextEarnings.epsActual !== null && (
                                    nextEarnings.epsActual >= (nextEarnings.epsEstimate || 0)
                                        ? <TrendingUp size={12} style={{ color: '#10b981' }} />
                                        : <TrendingDown size={12} style={{ color: '#ef4444' }} />
                                )}
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#64748b' }}>Revenue Est.</div>
                            <div style={{ fontWeight: 'bold' }}>
                                {formatCurrency(nextEarnings.revenueEstimate)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '1rem' }}>
                    No upcoming earnings scheduled
                </div>
            )}

            {/* AI Analysis Section */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                {!analysis ? (
                    <button
                        onClick={runAIAnalysis}
                        disabled={analyzing}
                        style={{
                            width: '100%',
                            background: analyzing ? 'transparent' : 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                            border: analyzing ? '1px solid var(--accent-purple)' : 'none',
                            color: analyzing ? 'var(--accent-purple)' : 'white',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            cursor: analyzing ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {analyzing ? (
                            <>
                                <span className={styles.spinner} style={{ width: 14, height: 14 }}></span>
                                Reading News...
                            </>
                        ) : (
                            <>
                                <span style={{ fontSize: '1rem' }}>🔮</span> Analyze News Sentiment
                            </>
                        )}
                    </button>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AI Sentiment</span>
                            <span style={{
                                fontWeight: 'bold',
                                color: analysis.sentiment === 'BULLISH' ? '#10b981' : analysis.sentiment === 'BEARISH' ? '#ef4444' : '#94a3b8',
                                background: analysis.sentiment === 'BULLISH' ? 'rgba(16, 185, 129, 0.1)' : analysis.sentiment === 'BEARISH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                            }}>
                                {analysis.sentiment} ({analysis.score})
                            </span>
                        </div>

                        {/* Sentiment Meter */}
                        <div style={{ height: '4px', background: '#334155', borderRadius: '2px', marginBottom: '0.75rem', position: 'relative' }}>
                            <div style={{
                                width: `${analysis.score}%`,
                                height: '100%',
                                background: analysis.score > 50 ? '#10b981' : '#ef4444',
                                borderRadius: '2px',
                                transition: 'width 1s ease-out'
                            }} />
                        </div>

                        <div style={{
                            fontSize: '0.8rem',
                            lineHeight: '1.4',
                            color: '#e2e8f0',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '10px',
                            borderRadius: '6px',
                            borderLeft: `2px solid ${analysis.sentiment === 'BULLISH' ? '#10b981' : analysis.sentiment === 'BEARISH' ? '#ef4444' : '#94a3b8'}`
                        }}>
                            "{analysis.summary}"
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

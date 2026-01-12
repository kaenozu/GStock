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

export const EarningsPanel: React.FC<EarningsPanelProps> = ({ symbol }) => {
    const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!symbol) return;

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
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: '#f59e0b' }} /> Earnings Calendar
            </h3>

            {nextEarnings ? (
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
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
                <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                    No upcoming earnings scheduled
                </div>
            )}

            {earnings.length > 1 && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                    +{earnings.length - 1} more upcoming
                </div>
            )}
        </div>
    );
};

'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { EarningsData, EarningsEvent } from '@/types/market';
import styles from './EarningsPanel.module.css';

interface EarningsPanelProps {
    symbol: string;
    onEarningsDates?: (dates: string[]) => void;
}

export const EarningsPanel: React.FC<EarningsPanelProps> = ({ symbol, onEarningsDates }) => {
    const [data, setData] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!symbol) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/earnings?symbol=${symbol}`);
                if (!res.ok) throw new Error('取得失敗');
                const json = await res.json();
                setData(json);
                
                // Notify parent of earnings dates for chart markers
                if (onEarningsDates && json.history) {
                    const dates = json.history.map((e: EarningsEvent) => e.date);
                    if (json.nextEarningsDate) dates.unshift(json.nextEarningsDate);
                    onEarningsDates(dates);
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : '不明なエラー');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, onEarningsDates]);

    if (!symbol) return null;
    if (loading) return <div className={styles.panel}><Clock size={16} /> 決算データ読み込み中...</div>;
    if (error) return <div className={styles.panel}><AlertTriangle size={16} /> {error}</div>;
    if (!data) return null;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    };

    const getDaysUntil = (dateStr: string | null) => {
        if (!dateStr) return null;
        const target = new Date(dateStr);
        const today = new Date();
        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const daysUntilEarnings = getDaysUntil(data.nextEarningsDate);

    const formatEps = (n: number | null) => {
        if (n === null) return 'N/A';
        return `$${n.toFixed(2)}`;
    };

    const formatSurprise = (n: number | null) => {
        if (n === null) return 'N/A';
        const sign = n >= 0 ? '+' : '';
        return `${sign}${n.toFixed(1)}%`;
    };

    return (
        <div className={styles.panel}>
            <h4 className={styles.title}>
                <Calendar size={16} /> 決算情報: {symbol}
            </h4>
            
            {/* Next Earnings */}
            <div className={styles.nextEarnings}>
                <div className={styles.label}>次回決算発表</div>
                <div className={styles.value}>
                    {data.nextEarningsDate ? (
                        <>
                            <span className={styles.date}>{formatDate(data.nextEarningsDate)}</span>
                            {daysUntilEarnings !== null && daysUntilEarnings > 0 && (
                                <span className={`${styles.countdown} ${daysUntilEarnings <= 7 ? styles.urgent : ''}`}>
                                    あと{daysUntilEarnings}日
                                </span>
                            )}
                        </>
                    ) : (
                        <span className={styles.na}>未定</span>
                    )}
                </div>
            </div>

            {/* Warning if earnings coming soon */}
            {daysUntilEarnings !== null && daysUntilEarnings <= 7 && daysUntilEarnings > 0 && (
                <div className={styles.warning}>
                    <AlertTriangle size={14} />
                    決算発表間近！ボラティリティ上昇に注意
                </div>
            )}

            {/* Past Earnings History */}
            <div className={styles.historySection}>
                <div className={styles.historyLabel}>過去の決算</div>
                <div className={styles.historyGrid}>
                    {data.history.slice(0, 4).map((e, i) => (
                        <div key={i} className={styles.historyItem}>
                            <div className={styles.period}>{e.period}</div>
                            <div className={styles.epsRow}>
                                <span className={styles.epsLabel}>EPS:</span>
                                <span className={styles.epsValue}>
                                    {formatEps(e.epsActual)}
                                    {e.epsEstimate && (
                                        <span className={styles.estimate}>
                                            (予想: {formatEps(e.epsEstimate)})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className={`${styles.surprise} ${(e.surprise ?? 0) >= 0 ? styles.beat : styles.miss}`}>
                                {(e.surprise ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {formatSurprise(e.surprise)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

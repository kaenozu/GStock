'use client';

import React, { useState, useEffect } from 'react';
import { BarChart2, AlertCircle } from 'lucide-react';
import styles from '@/app/page.module.css';
import { Skeleton } from '@/components/common/Skeleton';
import { TermWithTooltip } from '@/components/common/Tooltip';
import { InsiderSentimentData } from '@/types/market';

interface FinancialData {
    pe: number | null;
    eps: number | null;
    epsGrowth: number | null;
    roe: number | null;
    revenueGrowth: number | null;
    marketCap: number | null;
    _52wHigh: number | null;
    _52wLow: number | null;
}

interface FinancialsPanelProps {
    symbol: string;
}

export const FinancialsPanel: React.FC<FinancialsPanelProps> = ({ symbol }) => {
    const [data, setData] = useState<FinancialData | null>(null);
    const [insiderData, setInsiderData] = useState<InsiderSentimentData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!symbol) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [finRes, insRes] = await Promise.all([
                    fetch(`/api/financials?symbol=${symbol}`),
                    fetch(`/api/insider?symbol=${symbol}`)
                ]);

                if (!finRes.ok) throw new Error('財務データを取得できませんでした');
                const finJson = await finRes.json();
                setData(finJson);

                if (insRes.ok) {
                    const insJson = await insRes.json();
                    if (Array.isArray(insJson)) {
                        setInsiderData(insJson);
                    }
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : '予期しないエラーが発生しました');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol]);

    if (!symbol) return null;
    if (loading) {
        return (
            <div className={styles.financialsPanel}>
                <div style={{ marginBottom: '12px' }}>
                    <Skeleton width="120px" height="1rem" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i}>
                            <Skeleton width="60px" height="0.8rem" style={{ marginBottom: '4px' }} />
                            <Skeleton width="80px" height="1rem" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (error) return <div className={styles.financialsPanel}><AlertCircle size={16} /> {error}</div>;
    if (!data) return null;

    const formatNum = (n: number | null, suffix = '') => {
        if (n === null) return 'N/A';
        return n.toFixed(2) + suffix;
    };

    const formatMktCap = (n: number | null) => {
        if (n === null) return 'N/A';
        if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
        if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
        return `$${n.toFixed(0)}`;
    };

    const getScoreColor = (val: number | null, goodAbove: number, badBelow: number) => {
        if (val === null) return '#6b7280';
        if (val >= goodAbove) return '#10b981';
        if (val <= badBelow) return '#ef4444';
        return '#f59e0b';
    };

    return (
        <div className={styles.financialsPanel}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontSize: '0.9rem' }}>
                <BarChart2 size={16} /> Fundamentals: {symbol}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="P/E">P/E Ratio</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold', color: getScoreColor(data.pe, 15, 0) }}>
                        {formatNum(data.pe)}
                    </div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="EPS">EPS (TTM)</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold' }}>${formatNum(data.eps)}</div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="EPS Growth">EPS Growth</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold', color: getScoreColor(data.epsGrowth, 10, 0) }}>
                        {formatNum(data.epsGrowth, '%')}
                    </div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="ROE">ROE</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold', color: getScoreColor(data.roe, 15, 5) }}>
                        {formatNum(data.roe, '%')}
                    </div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="Revenue Growth">Revenue Growth</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold', color: getScoreColor(data.revenueGrowth, 10, 0) }}>
                        {formatNum(data.revenueGrowth, '%')}
                    </div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="Market Cap">Market Cap</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold' }}>{formatMktCap(data.marketCap)}</div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="52W High">52W High</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold', color: '#10b981' }}>${formatNum(data._52wHigh)}</div>
                </div>
                <div>
                    <span style={{ color: '#9ca3af' }}><TermWithTooltip term="52W Low">52W Low</TermWithTooltip></span>
                    <div style={{ fontWeight: 'bold', color: '#ef4444' }}>${formatNum(data._52wLow)}</div>
                </div>
            </div>

            {insiderData && insiderData.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#cbd5e1' }}><TermWithTooltip term="MSPR">Insider Confidence (MSPR)</TermWithTooltip></h5>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {insiderData.slice(0, 3).map((item) => (
                            <div key={`${item.year}-${item.month}`} style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '6px',
                                borderRadius: '4px',
                                flex: 1,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.year}-{String(item.month).padStart(2, '0')}</div>
                                <div style={{
                                    fontWeight: 'bold',
                                    color: item.mspr > 20 ? '#10b981' : item.mspr < -20 ? '#ef4444' : '#f59e0b'
                                }}>
                                    {item.mspr.toFixed(1)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

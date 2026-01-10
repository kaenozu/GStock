'use client';
import React from 'react';
import { BacktestReport } from '@/lib/backtest/BacktestArena';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface BacktestPanelProps {
    report: BacktestReport | null; // Allow generic type if mismatch, but let's assume structure matches
    isLoading: boolean;
    onRunBacktest: (period: string) => void;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ report, isLoading, onRunBacktest }) => {

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <Activity className="animate-spin" size={24} style={{ marginBottom: '1rem' }} />
                <div>Accessing Archives... Simulating History...</div>
            </div>
        );
    }

    if (!report) {
        return (
            <div style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Strategy Explorer (Time Machine)</h3>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => onRunBacktest('1y')}
                        style={{ padding: '0.5rem 1rem', background: 'var(--accent-purple)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Run 1 Year Test
                    </button>
                    <button
                        onClick={() => onRunBacktest('2y')}
                        style={{ padding: '0.5rem 1rem', background: '#334155', border: 'none', borderRadius: '4px', color: '#94a3b8', cursor: 'not-allowed', fontSize: '0.8rem' }}
                        disabled
                    >
                        2 Years (Locked)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem', border: '1px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--accent-cyan)" />
                    Backtest Report: {report.period}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{report.symbol}</span>
            </div>

            {/* Key Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Net Profit</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: report.profit >= 0 ? '#10b981' : '#ef4444' }}>
                        {report.profit >= 0 ? '+' : ''}{report.profit.toLocaleString()} ({report.profitPercent.toFixed(1)}%)
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Win Rate</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                        {report.winRate.toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Trades</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                        {report.tradeCount}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Max Drawdown</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {(report.maxDrawdown * 100).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Equity Curve */}
            <div style={{ height: '200px', width: '100%', marginBottom: '1rem' }}>
                <ResponsiveContainer>
                    <LineChart data={report.equityCurve}>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '4px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(val: any) => `¥${Number(val).toLocaleString()}`}
                        />
                        <Line type="monotone" dataKey="value" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Trades List (Scrollable) */}
            <div style={{ maxHeight: '150px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                {report.trades.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.25rem 0', color: '#cbd5e1' }}>
                        <span>{t.entryDate} <span style={{ color: t.type === 'BUY' ? '#10b981' : '#ef4444' }}>{t.type}</span></span>
                        <span>P/L: <span style={{ color: t.pnl >= 0 ? '#10b981' : '#ef4444' }}>{Math.round(t.pnl).toLocaleString()}</span> ({t.reason})</span>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button onClick={() => onRunBacktest('')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                    Close Report
                </button>
            </div>
        </div>
    );
};

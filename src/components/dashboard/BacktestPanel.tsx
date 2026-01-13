'use client';
import React from 'react';
import { BacktestReport } from '@/lib/backtest/BacktestArena';
import { OptimizationResult } from '@/lib/optimization/Optimizer';
import { Activity, Calendar, Search, Sparkles, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface BacktestPanelProps {
    report: BacktestReport | null;
    isLoading: boolean;
    onRunBacktest: (period: string, config?: { riskPercent: number, maxPosPercent: number, buyThreshold: number }) => void;
    // Optimization Props
    onRunOptimization?: (symbol: string, period: string) => void;
    isOptimizing?: boolean;
    optimizationResults?: OptimizationResult[] | null;
    scanningSymbol?: string;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({
    report,
    isLoading,
    onRunBacktest,
    onRunOptimization,
    isOptimizing,
    optimizationResults,
    scanningSymbol
}) => {
    const [riskPercent, setRiskPercent] = React.useState(2);
    const [buyThreshold, setBuyThreshold] = React.useState(70);
    const handleRun = (period: string) => {
        onRunBacktest(period, {
            riskPercent: riskPercent / 100,
            maxPosPercent: 0.2,
            buyThreshold
        });
    };

    const handleOptimize = () => {
        if (onRunOptimization && scanningSymbol) {
            onRunOptimization(scanningSymbol, '1y');
        }
    };

    const applyConfig = (config: { riskPercent: number, buyThreshold: number }) => {
        setRiskPercent(config.riskPercent * 100);
        setBuyThreshold(config.buyThreshold);
    };

    if (isLoading || isOptimizing) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <Activity className="animate-spin" size={24} style={{ marginBottom: '1rem', color: isOptimizing ? 'var(--accent-purple)' : undefined }} />
                <div>{isOptimizing ? 'AI is exploring optimal strategies...' : 'Accessing Archives... Simulating History...'}</div>
            </div>
        );
    }

    // Optimization Results View
    if (optimizationResults && !report) {
        return (
            <div style={{ padding: '1rem', border: '1px solid var(--accent-purple)', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} />
                        Optimization Results
                    </h3>
                    <button onClick={() => handleRun('1y')} style={{ fontSize: '0.7rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>
                        Cancel
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {optimizationResults.map((res, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px', background: i === 0 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                            borderRadius: '4px', border: i === 0 ? '1px solid var(--accent-purple)' : 'none'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
                                    Score: {res.score.toFixed(2)}
                                    {i === 0 && <span style={{ marginLeft: '8px', fontSize: '0.6rem', background: 'var(--accent-purple)', padding: '2px 4px', borderRadius: '2px' }}>BEST</span>}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    Risk: {(res.config.riskPercent * 100).toFixed(0)}% | Thresh: {res.config.buyThreshold} | PF: {res.report.profitFactor} | WR: {res.report.winRate.toFixed(0)}% | DD: {(res.report.maxDrawdown * 100).toFixed(1)}%
                                </div>
                            </div>
                            <button
                                onClick={() => applyConfig(res.config)}
                                style={{
                                    background: 'var(--accent-purple)', color: 'white', border: 'none',
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer'
                                }}
                            >
                                Apply
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Strategy Explorer (Time Machine)</h3>

                {/* Config Inputs */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Risk per Trade (%)</label>
                        <input
                            type="number"
                            value={riskPercent}
                            onChange={(e) => setRiskPercent(Number(e.target.value))}
                            style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '4px', borderRadius: '4px', width: '60px' }}
                        />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Confidence Threshold</label>
                        <input
                            type="number"
                            value={buyThreshold}
                            onChange={(e) => setBuyThreshold(Number(e.target.value))}
                            style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '4px', borderRadius: '4px', width: '60px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => handleRun('1y')}
                        style={{ padding: '0.5rem 1rem', background: 'var(--accent-cyan)', border: 'none', borderRadius: '4px', color: 'black', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                        Run 1 Year Test
                    </button>
                    {onRunOptimization && (
                        <button
                            onClick={handleOptimize}
                            style={{ padding: '0.5rem 1rem', background: 'var(--accent-purple)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Search size={14} />
                            Optimize
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem', border: '1px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--accent-cyan)" />
                    バックテストレポート: {report.period}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{report.symbol}</span>
            </div>

            {/* Key Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>純利益</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: report.profit >= 0 ? '#10b981' : '#ef4444' }}>
                        {report.profit >= 0 ? '+' : ''}{report.profit.toLocaleString()} ({report.profitPercent.toFixed(1)}%)
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>勝率</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>
                        {report.winRate.toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>取引数</div>
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

            {/* Config & Metrics Row 2 */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: '#1e293b', padding: '0.5rem', borderRadius: '4px', alignItems: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Profit Factor:</div>
                <div style={{ fontWeight: 'bold', color: report.profitFactor > 1.5 ? '#10b981' : report.profitFactor > 1.0 ? '#f59e0b' : '#ef4444' }}>
                    {report.profitFactor}
                </div>
                <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 0.5rem' }}></div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Strategy: Knowledge Agent (Risk {riskPercent}%, Threshold {buyThreshold})
                </div>
            </div>

            {/* Equity Curve */}
            <h4 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>資産推移 (Equity Curve)</h4>
            <div style={{ height: '200px', width: '100%', marginBottom: '1rem' }}>
                <ResponsiveContainer>
                    <LineChart data={report.equityCurve}>
                        <XAxis dataKey="time" hide />
                        <YAxis
                            domain={['auto', 'auto']}
                            hide
                        />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(val: any) => typeof val === 'number' ? `¥${val.toLocaleString()}` : ''}
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="var(--accent-cyan)"
                            strokeWidth={2}
                            dot={false}
                            animationDuration={1500}
                        />
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

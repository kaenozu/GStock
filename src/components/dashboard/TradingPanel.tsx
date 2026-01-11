'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, History } from 'lucide-react';
import styles from '@/app/page.module.css';
import { Portfolio } from '@/lib/trading/types';
import { Skeleton } from '@/components/common/Skeleton';
import { toast } from 'sonner';
import { safeToLocaleTimeString } from '@/lib/utils/format';

interface TradingPanelProps {
    symbol: string;
    currentPrice: number;
    executionMode: string;
}

export const TradingPanel = React.memo(function TradingPanel({ symbol, currentPrice, executionMode }: TradingPanelProps) {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const doFetch = async () => {
            try {
                const res = await fetch('/api/trade', {
                    headers: { 'x-execution-mode': executionMode }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPortfolio(data);
                }
            } catch (err) {
                console.error("Failed to fetch portfolio", err);
            }
        };
        doFetch();
        const interval = setInterval(doFetch, 5000);
        return () => clearInterval(interval);
    }, [executionMode, symbol, refreshTrigger]);

    const handleTrade = async (side: 'BUY' | 'SELL') => {
        if (!confirm(`Simulate ${side} 100 shares of ${symbol} @ ${currentPrice}?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-execution-mode': executionMode
                },
                body: JSON.stringify({
                    symbol,
                    side,
                    quantity: 100, // Fixed unit for testing
                    price: currentPrice,
                    reason: "Manual Override" // vs "Council Consensus"
                })
            });

            if (res.ok) {
                toast.success(`${side} Order Executed!`, { description: `${symbol} x 100` });
                setRefreshTrigger(prev => prev + 1);
            } else {
                const err = await res.json();
                toast.error(`Order Failed`, { description: err.error });
            }
        } catch {
            toast.error("Trade Execution Failed", { description: "Network or server error" });
        } finally {
            setLoading(false);
        }
    };

    if (!portfolio) {
        return (
            <div className={styles.card} style={{ borderColor: 'var(--accent-purple)' }}>
                <div className={styles.cardHeader}>
                    <Skeleton width="150px" height="1.5rem" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <Skeleton height="60px" borderRadius="8px" />
                    <Skeleton height="60px" borderRadius="8px" />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Skeleton height="40px" borderRadius="4px" />
                    <Skeleton height="40px" borderRadius="4px" />
                </div>
            </div>
        );
    }

    // Calculate Unrealized PnL approx
    const currentPosition = portfolio.positions.find(p => p.symbol === symbol);
    const posPnL = currentPosition ? (currentPrice - currentPosition.averagePrice) * currentPosition.quantity : 0;
    const posColor = posPnL >= 0 ? '#10b981' : '#ef4444';

    return (
        <div className={styles.card} style={{ borderColor: 'var(--accent-purple)' }}>
            <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={20} color="var(--accent-purple)" />
                    <h2 className={styles.cardTitle}>仮想ポートフォリオ (Iron Dome)</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CASH BALANCE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>¥{portfolio.cash.toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>TOTAL EQUITY</div>
                    {/* Simplified Equity: Cash + CostBasis of positions (ignoring realtime PnL for now unless calc'd) */}
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                        ¥{portfolio.cash.toLocaleString()}
                        {/* Note: Equity calculation needs live prices of ALL positions. 
                            For MVP, we just show Cash + Pos Cost approx? or just Cash for now.
                            Let's show Cash primarily. */}
                    </div>
                </div>
            </div>

            {/* Current Asset Info */}
            {currentPosition && (
                <div style={{ padding: '0.5rem', background: '#1e293b', borderRadius: '4px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Holding: {symbol} x {currentPosition.quantity}</span>
                    <span style={{ color: posColor }}>PnL: ¥{Math.round(posPnL).toLocaleString()}</span>
                </div>
            )}

            {/* Manual Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => handleTrade('BUY')}
                    disabled={loading}
                    style={{ flex: 1, padding: '0.75rem', background: '#10b981', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    買い 100
                </button>
                <button
                    onClick={() => handleTrade('SELL')}
                    disabled={loading || !currentPosition}
                    style={{ flex: 1, padding: '0.75rem', background: '#ef4444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    売り 100
                </button>
            </div>

            {/* Trade History */}
            <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <History size={12} /> 最近の取引
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {portfolio.trades.slice(0, 5).map(t => (
                        <div key={t.id} style={{ fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ color: t.side === 'BUY' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{t.side === 'BUY' ? '買い' : '売り'}</span> {t.symbol} x {t.quantity} @ {t.price}
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{safeToLocaleTimeString(new Date(t.timestamp))} - {t.reason}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

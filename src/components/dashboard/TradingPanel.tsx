/**
 * TradingPanel - 取引パネルコンポーネント
 * @description 仮想ポートフォリオの表示と取引操作
 * @module components/dashboard/TradingPanel
 */

'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, History, Download, TrendingUp, TrendingDown } from 'lucide-react';
import styles from '@/app/page.module.css';
import { Portfolio, Trade } from '@/lib/trading/types';
import { Skeleton } from '@/components/common/Skeleton';
import { toast } from 'sonner';
import { safeToLocaleTimeString } from '@/lib/utils/format';
import { ErrorLogger } from '@/lib/errors';

/** TradingPanelのProps */
interface TradingPanelProps {
    /** 現在の銘柄シンボル */
    symbol: string;
    /** 現在価格 */
    currentPrice: number;
    /** 実行モード（PAPER/LIVE） */
    executionMode: string;
}

/**
 * 取引履歴をCSV形式でエクスポート
 * @param trades - 取引一覧
 */
function exportTradesToCSV(trades: Trade[]): void {
    if (trades.length === 0) {
        toast.info('エクスポートする取引がありません');
        return;
    }

    const headers = [
        '日時',
        '銘柄',
        '売買',
        '数量',
        '価格',
        '合計金額',
        '手数料',
        '理由',
    ];

    const rows = trades.map(t => [
        new Date(t.timestamp).toLocaleString('ja-JP'),
        t.symbol,
        t.side === 'BUY' ? '買い' : '売り',
        t.quantity.toString(),
        t.price.toFixed(2),
        t.total.toFixed(2),
        (t.commission || 0).toFixed(2),
        t.reason || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gstock_trades_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('CSVエクスポート完了', {
        description: `${trades.length}件の取引をエクスポートしました`,
    });
}

/**
 * 取引パネルコンポーネント
 */
export const TradingPanel = React.memo(function TradingPanel({ 
    symbol, 
    currentPrice, 
    executionMode 
}: TradingPanelProps) {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ポートフォリオ取得
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

    const handleTrade = useCallback(async (side: 'BUY' | 'SELL') => {
        const action = side === 'BUY' ? '購入' : '売却';
        if (!confirm(`${symbol}を100株 ${action}しますか？\n価格: ¥${currentPrice.toLocaleString()}`)) return;

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
                    quantity: 100,
                    price: currentPrice,
                    reason: "Manual Override"
                })
            });

            if (res.ok) {
                toast.success(`${action}注文が実行されました`, { description: `${symbol} x 100` });
                setRefreshTrigger(prev => prev + 1);
            } else {
                const err = await res.json();
                toast.error(`注文失敗`, { description: err.error });
            }
        } catch {
            ErrorLogger.error('Trade execution failed', 'TradingPanel', { symbol, side });
            toast.error("取引実行エラー", { description: "ネットワークまたはサーバーエラー" });
        } finally {
            setLoading(false);
        }
    }, [symbol, currentPrice, executionMode]);

    if (!portfolio) {
        return (
            <div 
                className={styles.card} 
                style={{ borderColor: 'var(--accent-purple)' }}
                role="region"
                aria-label="取引パネル読み込み中"
            >
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

    const currentPosition = portfolio.positions.find(p => p.symbol === symbol);
    const posPnL = currentPosition ? (currentPrice - currentPosition.averagePrice) * currentPosition.quantity : 0;
    const posPnLPercent = currentPosition && currentPosition.averagePrice > 0 
        ? ((currentPrice - currentPosition.averagePrice) / currentPosition.averagePrice) * 100 
        : 0;
    const isProfit = posPnL >= 0;

    return (
        <div 
            className={styles.card} 
            style={{ borderColor: 'var(--accent-purple)' }}
            role="region"
            aria-label="仮想ポートフォリオ"
        >
            <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={20} color="var(--accent-purple)" aria-hidden="true" />
                    <h2 className={styles.cardTitle}>仮想ポートフォリオ (Iron Dome)</h2>
                </div>
            </div>

            {/* サマリー */}
            <div 
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}
                role="group"
                aria-label="ポートフォリオサマリー"
            >
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }} id="cash-label">現金残高</div>
                    <div 
                        style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                        aria-labelledby="cash-label"
                    >
                        ¥{portfolio.cash.toLocaleString()}
                    </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }} id="equity-label">総評価額</div>
                    <div 
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}
                        aria-labelledby="equity-label"
                    >
                        ¥{portfolio.equity.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* 現在ポジション */}
            {currentPosition && (
                <div 
                    style={{ 
                        padding: '0.5rem', 
                        background: '#1e293b', 
                        borderRadius: '4px', 
                        marginBottom: '1rem', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                    role="status"
                    aria-label={`${symbol}の保有状況`}
                >
                    <span>
                        保有: {symbol} x {currentPosition.quantity}
                    </span>
                    <span 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: isProfit ? '#10b981' : '#ef4444' 
                        }}
                        aria-label={`損益 ${isProfit ? '利益' : '損失'} ${Math.abs(posPnL).toLocaleString()}円`}
                    >
                        {isProfit ? (
                            <TrendingUp size={16} aria-hidden="true" />
                        ) : (
                            <TrendingDown size={16} aria-hidden="true" />
                        )}
                        <span>{isProfit ? '+' : ''}¥{Math.round(posPnL).toLocaleString()}</span>
                        <span style={{ fontSize: '0.75rem' }}>({posPnLPercent.toFixed(2)}%)</span>
                    </span>
                </div>
            )}

            {/* 取引ボタン */}
            <div 
                style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}
                role="group"
                aria-label="取引ボタン"
            >
                <button
                    onClick={() => handleTrade('BUY')}
                    disabled={loading}
                    aria-label={`${symbol}を100株購入`}
                    aria-busy={loading}
                    style={{ 
                        flex: 1, 
                        padding: '0.75rem', 
                        background: '#10b981', 
                        border: 'none', 
                        borderRadius: '4px', 
                        color: 'white', 
                        cursor: loading ? 'wait' : 'pointer', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    <TrendingUp size={16} aria-hidden="true" />
                    買い 100
                </button>
                <button
                    onClick={() => handleTrade('SELL')}
                    disabled={loading || !currentPosition}
                    aria-label={`${symbol}を100株売却`}
                    aria-disabled={!currentPosition}
                    aria-busy={loading}
                    style={{ 
                        flex: 1, 
                        padding: '0.75rem', 
                        background: currentPosition ? '#ef4444' : '#64748b', 
                        border: 'none', 
                        borderRadius: '4px', 
                        color: 'white', 
                        cursor: loading || !currentPosition ? 'not-allowed' : 'pointer', 
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}
                >
                    <TrendingDown size={16} aria-hidden="true" />
                    売り 100
                </button>
            </div>

            {/* 取引履歴 */}
            <div role="region" aria-label="取引履歴">
                <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#94a3b8', 
                    marginBottom: '0.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <History size={12} aria-hidden="true" /> 最近の取引
                    </span>
                    {portfolio.trades.length > 0 && (
                        <button
                            onClick={() => exportTradesToCSV(portfolio.trades)}
                            aria-label="取引履歴をCSVでエクスポート"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                background: 'transparent',
                                border: '1px solid #64748b',
                                borderRadius: '4px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >
                            <Download size={12} aria-hidden="true" /> CSV
                        </button>
                    )}
                </div>
                <div 
                    style={{ maxHeight: '150px', overflowY: 'auto' }}
                    role="list"
                    aria-label="取引一覧"
                >
                    {portfolio.trades.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                            取引履歴がありません
                        </div>
                    ) : (
                        portfolio.trades.slice(0, 5).map(t => (
                            <div 
                                key={t.id} 
                                style={{ 
                                    fontSize: '0.75rem', 
                                    padding: '0.25rem 0', 
                                    borderBottom: '1px solid rgba(255,255,255,0.1)' 
                                }}
                                role="listitem"
                            >
                                <span 
                                    style={{ 
                                        color: t.side === 'BUY' ? '#10b981' : '#ef4444', 
                                        fontWeight: 'bold',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                    }}
                                >
                                    {t.side === 'BUY' ? (
                                        <><TrendingUp size={12} aria-hidden="true" /> 買い</>
                                    ) : (
                                        <><TrendingDown size={12} aria-hidden="true" /> 売り</>
                                    )}
                                </span>
                                {' '}{t.symbol} x {t.quantity} @ {t.price.toFixed(2)}
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                    {safeToLocaleTimeString(new Date(t.timestamp))} - {t.reason}
                                    {t.commission && t.commission > 0 && (
                                        <span style={{ marginLeft: '8px' }}>(手数料: ¥{t.commission.toFixed(0)})</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
});

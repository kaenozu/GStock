/**
 * TradingPanel - 取引パネルコンポーネント
 * @description 仮想ポートフォリオの表示と取引操作 (V2: 指値・数量指定対応)
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
        '注文タイプ',
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
        t.orderType || 'MARKET',
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

    // Enhanced Trading State
    const [quantity, setQuantity] = useState(100);
    const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
    const [limitPrice, setLimitPrice] = useState<number>(currentPrice);
    const [quickOrder, setQuickOrder] = useState(false);

    // Update limit price default when current price changes (if in market mode)
    useEffect(() => {
        if (orderType === 'MARKET') {
            setLimitPrice(currentPrice);
        }
    }, [currentPrice, orderType]);

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
        const price = orderType === 'LIMIT' ? limitPrice : currentPrice;

        if (!quickOrder) {
            const message = orderType === 'LIMIT'
                ? `${symbol}を${quantity}株 指値 ¥${price.toLocaleString()} で${action}しますか？`
                : `${symbol}を${quantity}株 成行で${action}しますか？\n目安: ¥${(price * quantity).toLocaleString()}`;

            if (!confirm(message)) return;
        }

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
                    quantity,
                    price,
                    orderType,
                    reason: "Manual Trade"
                })
            });

            if (res.ok) {
                toast.success(`${action}注文が送信されました`, {
                    description: `${symbol} x ${quantity} (${orderType})`
                });
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
    }, [symbol, currentPrice, executionMode, quantity, orderType, limitPrice, quickOrder]);

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

            {/* 注文設定エリア */}
            <div style={{ marginBottom: '1rem' }}>
                {/* タブ */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem' }}>
                    {(['MARKET', 'LIMIT'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setOrderType(type)}
                            style={{
                                flex: 1,
                                padding: '6px',
                                background: orderType === type ? 'var(--accent-purple)' : 'rgba(255,255,255,0.05)',
                                color: orderType === type ? 'white' : '#94a3b8',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: orderType === type ? 'bold' : 'normal'
                            }}
                        >
                            {type === 'MARKET' ? '成行' : '指値'}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {/* 数量入力 */}
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>数量</div>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                            min={1}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: '#1e293b',
                                border: '1px solid #475569',
                                borderRadius: '4px',
                                color: 'white',
                                textAlign: 'right',
                                marginBottom: '4px'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            {[25, 50, 100].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        if (!portfolio) return;
                                        const price = orderType === 'LIMIT' ? limitPrice : currentPrice;
                                        if (price <= 0) return;
                                        const maxQty = Math.floor(portfolio.cash / price);
                                        const qty = Math.max(1, Math.floor(maxQty * (pct / 100)));
                                        setQuantity(qty);
                                    }}
                                    style={{
                                        padding: '2px 6px',
                                        fontSize: '0.65rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: '3px',
                                        color: '#94a3b8',
                                        cursor: 'pointer'
                                    }}
                                    title={`資産の${pct}%`}
                                >
                                    {pct === 100 ? 'MAX' : `${pct}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 価格入力（指値のみ） */}
                    <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                            {orderType === 'LIMIT' ? '指値価格' : '現在価格 (目安)'}
                        </div>
                        <input
                            type="number"
                            value={orderType === 'LIMIT' ? limitPrice : currentPrice}
                            onChange={(e) => orderType === 'LIMIT' && setLimitPrice(Number(e.target.value))}
                            disabled={orderType === 'MARKET'}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: orderType === 'LIMIT' ? '#1e293b' : 'transparent',
                                border: orderType === 'LIMIT' ? '1px solid #475569' : 'none',
                                borderRadius: '4px',
                                color: orderType === 'LIMIT' ? 'white' : '#94a3b8',
                                textAlign: 'right',
                                cursor: orderType === 'LIMIT' ? 'text' : 'not-allowed'
                            }}
                        />
                    </div>
                </div>

                {/* 推定合計 & クイック注文 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div>
                        <span style={{ color: '#94a3b8' }}>概算合計: </span>
                        <span style={{ fontWeight: 'bold' }}>
                            ¥{((orderType === 'LIMIT' ? limitPrice : currentPrice) * quantity).toLocaleString()}
                        </span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={quickOrder}
                            onChange={(e) => setQuickOrder(e.target.checked)}
                            style={{ accentColor: 'var(--accent-cyan)' }}
                        />
                        <span style={{ color: quickOrder ? 'var(--accent-cyan)' : '#64748b' }}>クイック注文</span>
                    </label>
                </div>
            </div>

            {/* 取引ボタン */}
            <div
                style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}
                role="group"
                aria-label="取引ボタン"
            >
                <button
                    onClick={() => handleTrade('BUY')}
                    disabled={loading}
                    aria-label={`${symbol}を${quantity}株購入`}
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
                    買い {quantity}
                </button>
                <button
                    onClick={() => handleTrade('SELL')}
                    disabled={loading || !currentPosition}
                    aria-label={`${symbol}を${quantity}株売却`}
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
                    売り {quantity}
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
                                    {safeToLocaleTimeString(new Date(t.timestamp))} - {t.orderType} - {t.reason}
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

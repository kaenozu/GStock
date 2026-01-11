/**
 * PortfolioBacktestPanel Component
 * @description ポートフォリオバックテストUI
 * @module components/dashboard/PortfolioBacktestPanel
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Briefcase, TrendingUp, TrendingDown, Play, Plus, Trash2, AlertCircle } from 'lucide-react';
import styles from '@/app/page.module.css';
import {
    runPortfolioBacktest,
    PortfolioAssetConfig,
    PortfolioBacktestResult,
    PORTFOLIO_TEMPLATES,
} from '@/lib/backtest/PortfolioBacktest';
import { StockDataPoint } from '@/types/market';
import { MONITOR_LIST } from '@/config/constants';

/** 期間選択肢 */
const PERIOD_OPTIONS = [
    { label: '3ヶ月', days: 90 },
    { label: '6ヶ月', days: 180 },
    { label: '1年', days: 365 },
    { label: '2年', days: 730 },
];

/**
 * ポートフォリオバックテストパネル
 */
export const PortfolioBacktestPanel: React.FC = () => {
    const [assets, setAssets] = useState<PortfolioAssetConfig[]>([
        { symbol: 'AAPL', weight: 50 },
        { symbol: 'MSFT', weight: 50 },
    ]);
    const [periodDays, setPeriodDays] = useState(365);
    const [initialCapital, setInitialCapital] = useState(100000);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PortfolioBacktestResult | null>(null);

    // 配分比率の合計
    const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);
    const isValidWeight = Math.abs(totalWeight - 100) < 0.01;

    // 銘柄追加
    const addAsset = useCallback(() => {
        const usedSymbols = assets.map(a => a.symbol);
        const availableSymbol = MONITOR_LIST.find(s => !usedSymbols.includes(s)) || 'NVDA';
        setAssets(prev => [...prev, { symbol: availableSymbol, weight: 0 }]);
    }, [assets]);

    // 銘柄削除
    const removeAsset = useCallback((index: number) => {
        setAssets(prev => prev.filter((_, i) => i !== index));
    }, []);

    // 銘柄更新
    const updateAsset = useCallback((index: number, field: 'symbol' | 'weight', value: string | number) => {
        setAssets(prev => prev.map((a, i) => {
            if (i !== index) return a;
            if (field === 'weight') {
                return { ...a, weight: Math.max(0, Math.min(100, Number(value))) };
            }
            return { ...a, symbol: String(value) };
        }));
    }, []);

    // テンプレート適用
    const applyTemplate = useCallback((templateName: keyof typeof PORTFOLIO_TEMPLATES) => {
        setAssets(PORTFOLIO_TEMPLATES[templateName]);
    }, []);

    // バックテスト実行
    const runBacktest = useCallback(async () => {
        if (!isValidWeight) {
            setError('配分比率の合計を100%にしてください');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // 各銘柄のデータを取得
            const dataMap: Record<string, StockDataPoint[]> = {};
            
            for (const asset of assets) {
                const response = await fetch(`/api/stock?symbol=${asset.symbol}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch data for ${asset.symbol}`);
                }
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                dataMap[asset.symbol] = data;
            }

            // バックテスト実行
            const backtestResult = runPortfolioBacktest(
                { assets, initialCapital, periodDays },
                dataMap
            );

            setResult(backtestResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [assets, initialCapital, periodDays, isValidWeight]);

    return (
        <div className={styles.card} style={{ borderColor: 'var(--accent-cyan)' }}>
            <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={20} color="var(--accent-cyan)" />
                    <h2 className={styles.cardTitle}>ポートフォリオバックテスト</h2>
                </div>
            </div>

            {/* テンプレート選択 */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    テンプレート
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(PORTFOLIO_TEMPLATES).map(name => (
                        <button
                            key={name}
                            onClick={() => applyTemplate(name as keyof typeof PORTFOLIO_TEMPLATES)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '0.7rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid #64748b',
                                borderRadius: '4px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 銘柄構成 */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#94a3b8', 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>構成銘柄 (合計: {totalWeight}%)</span>
                    {!isValidWeight && (
                        <span style={{ color: '#ef4444' }}>→ 100%にしてください</span>
                    )}
                </div>
                
                {assets.map((asset, index) => (
                    <div 
                        key={index}
                        style={{ 
                            display: 'flex', 
                            gap: '0.5rem', 
                            marginBottom: '0.5rem',
                            alignItems: 'center'
                        }}
                    >
                        <select
                            value={asset.symbol}
                            onChange={(e) => updateAsset(index, 'symbol', e.target.value)}
                            style={{
                                flex: 1,
                                padding: '6px',
                                background: '#1e293b',
                                border: '1px solid #64748b',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '0.8rem',
                            }}
                        >
                            {MONITOR_LIST.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={asset.weight}
                            onChange={(e) => updateAsset(index, 'weight', e.target.value)}
                            min={0}
                            max={100}
                            style={{
                                width: '60px',
                                padding: '6px',
                                background: '#1e293b',
                                border: '1px solid #64748b',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '0.8rem',
                                textAlign: 'right',
                            }}
                        />
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>%</span>
                        <button
                            onClick={() => removeAsset(index)}
                            disabled={assets.length <= 1}
                            style={{
                                padding: '4px',
                                background: 'transparent',
                                border: 'none',
                                color: assets.length <= 1 ? '#64748b' : '#ef4444',
                                cursor: assets.length <= 1 ? 'not-allowed' : 'pointer',
                            }}
                            aria-label="銘柄を削除"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                <button
                    onClick={addAsset}
                    disabled={assets.length >= MONITOR_LIST.length}
                    style={{
                        width: '100%',
                        padding: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px dashed #64748b',
                        borderRadius: '4px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                    }}
                >
                    <Plus size={14} /> 銘柄を追加
                </button>
            </div>

            {/* 設定 */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>期間</div>
                    <select
                        value={periodDays}
                        onChange={(e) => setPeriodDays(Number(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '6px',
                            background: '#1e293b',
                            border: '1px solid #64748b',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '0.8rem',
                        }}
                    >
                        {PERIOD_OPTIONS.map(opt => (
                            <option key={opt.days} value={opt.days}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>初期資金</div>
                    <input
                        type="number"
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(Number(e.target.value))}
                        min={1000}
                        step={10000}
                        style={{
                            width: '100%',
                            padding: '6px',
                            background: '#1e293b',
                            border: '1px solid #64748b',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '0.8rem',
                        }}
                    />
                </div>
            </div>

            {/* 実行ボタン */}
            <button
                onClick={runBacktest}
                disabled={isLoading || !isValidWeight}
                style={{
                    width: '100%',
                    padding: '10px',
                    background: isValidWeight ? 'var(--accent-cyan)' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: isLoading || !isValidWeight ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                <Play size={16} />
                {isLoading ? '分析中...' : 'バックテスト実行'}
            </button>

            {/* エラー表示 */}
            {error && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* 結果表示 */}
            {result && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ 
                        padding: '1rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#94a3b8', 
                            marginBottom: '0.5rem' 
                        }}>
                            ポートフォリオ全体
                        </div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '0.75rem' 
                        }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>総リターン</div>
                                <div style={{ 
                                    fontSize: '1.25rem', 
                                    fontWeight: 'bold',
                                    color: result.totalReturnPercent >= 0 ? '#10b981' : '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {result.totalReturnPercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    {result.totalReturnPercent >= 0 ? '+' : ''}{result.totalReturnPercent}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>最終評価額</div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                    ${result.finalValue.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>年率リターン</div>
                                <div style={{ fontSize: '0.9rem' }}>
                                    {result.annualizedReturn >= 0 ? '+' : ''}{result.annualizedReturn}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>シャープレシオ</div>
                                <div style={{ fontSize: '0.9rem' }}>
                                    {result.sharpeRatio}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>最大DD</div>
                                <div style={{ fontSize: '0.9rem', color: '#ef4444' }}>
                                    -{result.maxDrawdown}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>ボラティリティ</div>
                                <div style={{ fontSize: '0.9rem' }}>
                                    {result.volatility}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 個別銘柄結果 */}
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        個別銘柄リターン
                    </div>
                    {result.assetResults.map((asset, i) => (
                        <div 
                            key={i}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div>
                                <span style={{ fontWeight: 'bold' }}>{asset.symbol}</span>
                                <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.75rem' }}>
                                    ({asset.weight}%)
                                </span>
                            </div>
                            <div style={{ 
                                color: asset.returnPercent >= 0 ? '#10b981' : '#ef4444',
                                fontWeight: 'bold',
                            }}>
                                {asset.returnPercent >= 0 ? '+' : ''}{asset.returnPercent}%
                            </div>
                        </div>
                    ))}

                    <div style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.65rem', 
                        color: '#64748b',
                        textAlign: 'right' 
                    }}>
                        手数料: ${result.totalCommission} | 期間: {result.periodDays}日
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioBacktestPanel;

'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, RefreshCw, Download, Calendar } from 'lucide-react';

interface StrategyResult {
    name: string;
    profit: number;
    trades: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
}

interface MultiStrategyComparisonProps {
    results: StrategyResult[];
    onRunStrategy: (strategyIndex: number) => void;
    isRunning?: boolean;
}

export function MultiStrategyComparison({ results, onRunStrategy, isRunning }: MultiStrategyComparisonProps) {
    const [sortBy, setSortBy] = useState<'profit' | 'sharpe' | 'winRate'>('profit');

    const sortedResults = [...results].sort((a, b) => {
        const key = sortBy === 'sharpe' ? 'sharpeRatio' : sortBy;
        return (b[key as keyof StrategyResult] as number) - (a[key as keyof StrategyResult] as number);
    });
    const winner = sortedResults[0];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">マルチストラテジー比較</h3>
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                >
                    <option value="profit">利益順</option>
                    <option value="sharpe">シャープレシオ順</option>
                    <option value="winRate">勝率順</option>
                </select>
            </div>

            {winner && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md mb-4">
                    <div className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                        🏆 最優先戦略: {winner.name}
                    </div>
                </div>
            )}

            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sortedResults}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff'
                        }}
                    />
                    <Legend />
                    <Bar dataKey="profit" fill="#3b82f6" name="利益 (%)" />
                    <Bar dataKey="sharpeRatio" fill="#8b5cf6" name="シャープレシオ" />
                    <Bar dataKey="winRate" fill="#10b981" name="勝率 (%)" />
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
                {sortedResults.map((result, index) => (
                    <div
                        key={result.name}
                        className={`p-3 rounded-md border ${
                            index === 0
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{result.name}</span>
                            {index === 0 && <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded">最優先</span>}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">利益</div>
                                <div className={`font-semibold ${result.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.profit.toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">取引数</div>
                                <div className="font-semibold">{result.trades}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">シャープ</div>
                                <div className="font-semibold">{result.sharpeRatio.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">勝率</div>
                                <div className="font-semibold">{result.winRate.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={() => onRunStrategy(0)}
                    disabled={isRunning}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isRunning ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            実行中...
                        </>
                    ) : (
                        <>
                            <TrendingUp className="w-4 h-4" />
                            最優先戦略を実行
                        </>
                    )}
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    CSV出力
                </button>
            </div>
        </div>
    );
}

interface PeriodAnalysisProps {
    symbol: string;
    onRunPeriod: (period: string) => void;
    isRunning?: boolean;
}

export function PeriodAnalysis({ symbol, onRunPeriod, isRunning }: PeriodAnalysisProps) {
    const periods = [
        { id: '3mo', label: '3ヶ月', months: 3 },
        { id: '6mo', label: '6ヶ月', months: 6 },
        { id: '1y', label: '1年', months: 12 },
        { id: '2y', label: '2年', months: 24 },
    ];

    const mockResults = periods.map(period => ({
        ...period,
        profit: Math.random() * 40 - 10,
        sharpeRatio: Math.random() * 2 + 0.5,
        winRate: Math.random() * 30 + 50,
    }));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5" />
                <h3 className="text-lg font-semibold">期間別分析</h3>
            </div>

            <div className="space-y-3">
                {mockResults.map(result => (
                    <div
                        key={result.id}
                        className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-md border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{result.label}</span>
                            <button
                                onClick={() => onRunPeriod(result.id)}
                                disabled={isRunning}
                                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                            >
                                実行
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">利益</div>
                                <div className={`font-semibold ${result.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {result.profit.toFixed(2)}%
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">シャープ</div>
                                <div className="font-semibold">{result.sharpeRatio.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 dark:text-gray-400">勝率</div>
                                <div className="font-semibold">{result.winRate.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

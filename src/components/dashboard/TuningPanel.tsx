'use client';

import { useState } from 'react';
import { Play, RefreshCw, Settings, TrendingUp, AlertTriangle, Check } from 'lucide-react';

interface OptimizationResult {
    buyThreshold: number;
    sellThreshold: number;
    profit: number;
    trades: number;
    sharpeRatio: number;
    maxDrawdown: number;
}

export function TuningPanel() {
    const [symbol, setSymbol] = useState('AAPL');
    const [period, setPeriod] = useState('1y');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [result, setResult] = useState<OptimizationResult | null>(null);
    const [autoOptimize, setAutoOptimize] = useState(false);
    const [autoSchedule, setAutoSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'off'>('off');

    const runOptimization = async () => {
        setIsOptimizing(true);
        try {
            const response = await fetch('/api/tuning/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, period })
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            }
        } catch (error) {
            console.error('Optimization failed:', error);
        } finally {
            setIsOptimizing(false);
        }
    };

    const applyOptimization = async () => {
        try {
            const response = await fetch('/api/tuning/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyThreshold: result?.buyThreshold,
                    sellThreshold: result?.sellThreshold
                })
            });

            if (response.ok) {
                alert('最適化パラメータを適用しました');
            }
        } catch (error) {
            console.error('Failed to apply optimization:', error);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Model Tuning</h2>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="symbol" className="block text-sm font-medium mb-2">
                            シンボル
                        </label>
                        <input
                            id="symbol"
                            type="text"
                            value={symbol}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymbol(e.target.value.toUpperCase())}
                            placeholder="AAPL"
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label htmlFor="period" className="block text-sm font-medium mb-2">
                            期間
                        </label>
                        <select
                            id="period"
                            value={period}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="1y">1年</option>
                            <option value="2y">2年</option>
                            <option value="5y">5年</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={runOptimization}
                    disabled={isOptimizing || !symbol}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isOptimizing ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            最適化中...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            最適化実行
                        </>
                    )}
                </button>

                {result && (
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            最適化結果
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <div className="text-sm text-gray-600 dark:text-gray-400">売買閾値</div>
                                <div className="text-2xl font-bold">
                                    買い: {result.buyThreshold}% / 売り: {result.sellThreshold}%
                                </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                <div className="text-sm text-gray-600 dark:text-gray-400">総利益</div>
                                <div className="text-2xl font-bold">{result.profit.toFixed(2)}%</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">取引回数</div>
                                <div className="font-semibold">{result.trades}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">シャープレシオ</div>
                                <div className="font-semibold">{result.sharpeRatio.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">最大ドローダウン</div>
                                <div className="font-semibold text-red-600">
                                    -{result.maxDrawdown.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={applyOptimization}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            パラメータを適用
                        </button>
                    </div>
                )}

                <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        自動最適化設定
                    </h3>

                    <div className="flex items-center justify-between">
                        <label htmlFor="auto-optimize" className="text-sm font-medium">
                            自動最適化
                        </label>
                        <input
                            type="checkbox"
                            id="auto-optimize"
                            checked={autoOptimize}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoOptimize(e.target.checked)}
                            className="w-4 h-4"
                        />
                    </div>

                    {autoOptimize && (
                        <div>
                            <label className="block text-sm font-medium mb-2">スケジュール</label>
                            <select
                                value={autoSchedule}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAutoSchedule(e.target.value as any)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="daily">日次</option>
                                <option value="weekly">週次</option>
                                <option value="monthly">月次</option>
                                <option value="off">オフ</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

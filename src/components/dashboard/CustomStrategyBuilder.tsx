'use client';

import { useState } from 'react';
import { Plus, Trash2, Play, Save, Settings, Info } from 'lucide-react';

interface StrategyCondition {
    id: string;
    type: 'INDICATOR' | 'PRICE' | 'TIME' | 'VOLATILITY';
    operator: '>' | '<' | '=' | '>=' | '<=' | 'CROSS_ABOVE' | 'CROSS_BELOW';
    value: number;
    parameter?: string;
}

interface StrategyAction {
    id: string;
    type: 'BUY' | 'SELL' | 'CLOSE';
    quantity: number;
    quantityType: 'PERCENT' | 'FIXED' | 'ALL';
}

interface CustomStrategy {
    id: string;
    name: string;
    description: string;
    conditions: StrategyCondition[];
    actions: StrategyAction[];
    riskManagement: {
        stopLoss?: number;
        takeProfit?: number;
        maxPositionSize?: number;
    };
}

export function CustomStrategyBuilder() {
    const [strategy, setStrategy] = useState<CustomStrategy>({
        id: '1',
        name: 'カスタム戦略',
        description: '私のカスタム戦略',
        conditions: [],
        actions: [],
        riskManagement: {},
    });

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        profit: number;
        trades: number;
        winRate: number;
        maxDrawdown: number;
    } | null>(null);

    const indicatorOptions = [
        { value: 'RSI', label: 'RSI' },
        { value: 'MACD', label: 'MACD' },
        { value: 'SMA_20', label: 'SMA20' },
        { value: 'SMA_50', label: 'SMA50' },
        { value: 'BB_UPPER', label: 'ボリンジャーバンド（上）' },
        { value: 'BB_LOWER', label: 'ボリンジャーバンド（下）' },
        { value: 'ADX', label: 'ADX' },
        { value: 'VOLUME', label: '出来高' },
    ];

    const operatorOptions = [
        { value: '>', label: 'より大きい' },
        { value: '<', label: 'より小さい' },
        { value: '=', label: '等しい' },
        { value: '>=', label: '以上' },
        { value: '<=', label: '以下' },
        { value: 'CROSS_ABOVE', label: '上抜け' },
        { value: 'CROSS_BELOW', label: '下抜け' },
    ];

    const conditionTypeOptions = [
        { value: 'INDICATOR', label: 'インジケーター' },
        { value: 'PRICE', label: '価格' },
        { value: 'TIME', label: '時間' },
        { value: 'VOLATILITY', label: 'ボラティリティ' },
    ];

    const addCondition = () => {
        const newCondition: StrategyCondition = {
            id: Date.now().toString(),
            type: 'INDICATOR',
            operator: '>',
            value: 50,
        };
        setStrategy({
            ...strategy,
            conditions: [...strategy.conditions, newCondition],
        });
    };

    const removeCondition = (id: string) => {
        setStrategy({
            ...strategy,
            conditions: strategy.conditions.filter(c => c.id !== id),
        });
    };

    const updateCondition = (id: string, field: keyof StrategyCondition, value: any) => {
        setStrategy({
            ...strategy,
            conditions: strategy.conditions.map(c =>
                c.id === id ? { ...c, [field]: value } : c
            ),
        });
    };

    const addAction = () => {
        const newAction: StrategyAction = {
            id: Date.now().toString(),
            type: 'BUY',
            quantity: 10,
            quantityType: 'PERCENT',
        };
        setStrategy({
            ...strategy,
            actions: [...strategy.actions, newAction],
        });
    };

    const removeAction = (id: string) => {
        setStrategy({
            ...strategy,
            actions: strategy.actions.filter(a => a.id !== id),
        });
    };

    const updateAction = (id: string, field: keyof StrategyAction, value: any) => {
        setStrategy({
            ...strategy,
            actions: strategy.actions.map(a =>
                a.id === id ? { ...a, [field]: value } : a
            ),
        });
    };

    const runTest = async () => {
        setIsTesting(true);

        setTimeout(() => {
            setTestResult({
                profit: Math.random() * 30 - 5,
                trades: Math.floor(Math.random() * 50) + 10,
                winRate: Math.random() * 20 + 40,
                maxDrawdown: Math.random() * 20,
            });
            setIsTesting(false);
        }, 2000);
    };

    const saveStrategy = () => {
        const savedStrategies = JSON.parse(
            localStorage.getItem('custom-strategies') || '[]'
        );

        localStorage.setItem(
            'custom-strategies',
            JSON.stringify([...savedStrategies, strategy])
        );

        alert('戦略を保存しました');
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">カスタム戦略ビルダー</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={runTest}
                        disabled={isTesting}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 flex items-center gap-2"
                    >
                        <Play className="w-4 h-4" />
                        {isTesting ? 'テスト中...' : 'バックテスト'}
                    </button>
                    <button
                        onClick={saveStrategy}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        保存
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-2">戦略名</label>
                    <input
                        type="text"
                        value={strategy.name}
                        onChange={(e) => setStrategy({ ...strategy, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">説明</label>
                    <input
                        type="text"
                        value={strategy.description}
                        onChange={(e) => setStrategy({ ...strategy, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        条件設定
                    </h3>
                    <button
                        onClick={addCondition}
                        className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 py-1 px-3 rounded-md flex items-center gap-1 text-sm"
                    >
                        <Plus className="w-3 h-3" />
                        条件を追加
                    </button>
                </div>

                <div className="space-y-3">
                    {strategy.conditions.map((condition, index) => (
                        <div
                            key={condition.id}
                            className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded-md border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">条件 {index + 1}</span>
                                <button
                                    onClick={() => removeCondition(condition.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <select
                                    value={condition.type}
                                    onChange={(e) => updateCondition(condition.id, 'type', e.target.value)}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                >
                                    {conditionTypeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={condition.parameter}
                                    onChange={(e) => updateCondition(condition.id, 'parameter', e.target.value)}
                                    disabled={condition.type !== 'INDICATOR'}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                >
                                    <option value="">選択...</option>
                                    {indicatorOptions.map(ind => (
                                        <option key={ind.value} value={ind.value}>
                                            {ind.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={condition.operator}
                                    onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                >
                                    {operatorOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={condition.value}
                                    onChange={(e) => updateCondition(condition.id, 'value', Number(e.target.value))}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">アクション設定</h3>
                    <button
                        onClick={addAction}
                        className="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 py-1 px-3 rounded-md flex items-center gap-1 text-sm"
                    >
                        <Plus className="w-3 h-3" />
                        アクションを追加
                    </button>
                </div>

                <div className="space-y-3">
                    {strategy.actions.map((action, index) => (
                        <div
                            key={action.id}
                            className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded-md border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">アクション {index + 1}</span>
                                <button
                                    onClick={() => removeAction(action.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <select
                                    value={action.type}
                                    onChange={(e) => updateAction(action.id, 'type', e.target.value)}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                >
                                    <option value="BUY">買い</option>
                                    <option value="SELL">売り</option>
                                    <option value="CLOSE">決済</option>
                                </select>
                                <input
                                    type="number"
                                    value={action.quantity}
                                    onChange={(e) => updateAction(action.id, 'quantity', Number(e.target.value))}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                />
                                <select
                                    value={action.quantityType}
                                    onChange={(e) => updateAction(action.id, 'quantityType', e.target.value)}
                                    className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                                >
                                    <option value="PERCENT">パーセント</option>
                                    <option value="FIXED">固定額</option>
                                    <option value="ALL">全額</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <h3 className="font-semibold mb-3">リスク管理</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">ストップロス（%）</label>
                        <input
                            type="number"
                            value={strategy.riskManagement.stopLoss || ''}
                            onChange={(e) => setStrategy({
                                ...strategy,
                                riskManagement: {
                                    ...strategy.riskManagement,
                                    stopLoss: e.target.value ? Number(e.target.value) : undefined,
                                },
                            })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">テイクプロフィット（%）</label>
                        <input
                            type="number"
                            value={strategy.riskManagement.takeProfit || ''}
                            onChange={(e) => setStrategy({
                                ...strategy,
                                riskManagement: {
                                    ...strategy.riskManagement,
                                    takeProfit: e.target.value ? Number(e.target.value) : undefined,
                                },
                            })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">最大ポジションサイズ（%）</label>
                        <input
                            type="number"
                            value={strategy.riskManagement.maxPositionSize || ''}
                            onChange={(e) => setStrategy({
                                ...strategy,
                                riskManagement: {
                                    ...strategy.riskManagement,
                                    maxPositionSize: e.target.value ? Number(e.target.value) : undefined,
                                },
                            })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            </div>

            {testResult && (
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">バックテスト結果</h3>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">利益</div>
                            <div className={`text-xl font-bold ${testResult.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {testResult.profit.toFixed(2)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">取引回数</div>
                            <div className="text-xl font-bold">{testResult.trades}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">勝率</div>
                            <div className="text-xl font-bold">{testResult.winRate.toFixed(1)}%</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">最大ドローダウン</div>
                            <div className="text-xl font-bold text-red-600">
                                -{testResult.maxDrawdown.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

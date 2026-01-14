'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Target, Calculator, TrendingDown, TrendingUp, Check, Settings, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface RiskMetric {
    id: string;
    name: string;
    value: number;
    threshold: number;
    unit: string;
    status: 'GOOD' | 'WARNING' | 'DANGER';
}

interface PositionRisk {
    symbol: string;
    value: number;
    allocation: number;
    beta: number;
    risk: number;
    action: 'REDUCE' | 'HOLD' | 'INCREASE';
}

interface RiskManagementSettings {
    maxPositionSize: number;
    maxSectorAllocation: number;
    maxTotalExposure: number;
    volatilityThreshold: number;
    drawdownLimit: number;
}

export function EnhancedRiskManagement() {
    const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([
        { id: '1', name: '最大ポジションサイズ', value: 15, threshold: 20, unit: '%', status: 'GOOD' },
        { id: '2', name: '最大セクター配分', value: 28, threshold: 30, unit: '%', status: 'WARNING' },
        { id: '3', name: 'ボラティリティ', value: 0.18, threshold: 0.25, unit: '', status: 'GOOD' },
        { id: '4', name: '最大ドローダウン', value: -8.5, threshold: -10, unit: '%', status: 'WARNING' },
    ]);

    const [positionRisks, setPositionRisks] = useState<PositionRisk[]>([
        { symbol: 'AAPL', value: 450000, allocation: 18, beta: 1.2, risk: 0.72, action: 'HOLD' },
        { symbol: 'MSFT', value: 380000, allocation: 15, beta: 0.9, risk: 0.54, action: 'HOLD' },
        { symbol: 'GOOGL', value: 320000, allocation: 13, beta: 1.1, risk: 0.66, action: 'HOLD' },
        { symbol: 'AMZN', value: 280000, allocation: 11, beta: 1.3, risk: 0.78, action: 'HOLD' },
        { symbol: 'NVDA', value: 250000, allocation: 10, beta: 1.8, risk: 1.08, action: 'REDUCE' },
        { symbol: 'TSLA', value: 200000, allocation: 8, beta: 2.1, risk: 1.26, action: 'REDUCE' },
    ]);

    const [settings, setSettings] = useState<RiskManagementSettings>({
        maxPositionSize: 20,
        maxSectorAllocation: 30,
        maxTotalExposure: 100,
        volatilityThreshold: 0.25,
        drawdownLimit: -10,
    });

    const [showSettings, setShowSettings] = useState(false);
    const [autoAdjust, setAutoAdjust] = useState(true);

    const totalRisk = positionRisks.reduce((sum, pos) => sum + pos.risk, 0);

    const updateRiskMetric = (id: string, value: number) => {
        setRiskMetrics(metrics => metrics.map(m =>
            m.id === id
                ? {
                    ...m,
                    value,
                    status: Math.abs(value) <= Math.abs(m.threshold)
                        ? 'GOOD'
                        : Math.abs(value) <= Math.abs(m.threshold) * 1.5
                            ? 'WARNING'
                            : 'DANGER',
                }
                : m
        ));
    };

    const updateSetting = (field: keyof RiskManagementSettings, value: number) => {
        setSettings({ ...settings, [field]: value });
    };

    const executeAutoAdjust = () => {
        const toReduce = positionRisks.filter(pos => pos.action === 'REDUCE');
        const toIncrease = positionRisks.filter(pos => pos.action === 'INCREASE');

        console.log('Auto-adjusting positions:', { toReduce, toIncrease });
        alert(`自動調整実行: ${toReduce.length}件の縮小、${toIncrease.length}件の拡大`);
    };

    const statusColors = {
        GOOD: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-400 dark:border-green-600',
        WARNING: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-400 dark:border-yellow-600',
        DANGER: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-400 dark:border-red-600',
    };

    const actionColors = {
        REDUCE: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
        HOLD: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
        INCREASE: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    };

    const riskHistory = [
        { date: '1週間前', totalRisk: 0.85, maxExposure: 95 },
        { date: '6日前', totalRisk: 0.88, maxExposure: 97 },
        { date: '5日前', totalRisk: 0.82, maxExposure: 92 },
        { date: '4日前', totalRisk: 0.90, maxExposure: 98 },
        { date: '3日前', totalRisk: 0.87, maxExposure: 94 },
        { date: '2日前', totalRisk: 0.86, maxExposure: 93 },
        { date: '昨日', totalRisk: 0.84, maxExposure: 91 },
        { date: '今日', totalRisk: 0.88, maxExposure: 95 },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">拡張リスク管理</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoAdjust(!autoAdjust)}
                        className={`px-3 py-1.5 border rounded-md flex items-center gap-2 ${autoAdjust ? 'bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-600' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-400 dark:border-gray-600'}`}
                    >
                        {autoAdjust ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                        {autoAdjust ? '自動調整ON' : '自動調整OFF'}
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-3 py-1.5 border rounded-md bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-900/30"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        リスク指標
                    </h3>
                    <div className="space-y-3">
                        {riskMetrics.map(metric => (
                            <div
                                key={metric.id}
                                className={`p-3 rounded-md border ${statusColors[metric.status]}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{metric.name}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        metric.status === 'GOOD'
                                            ? 'bg-green-600 text-white'
                                            : metric.status === 'WARNING'
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-red-600 text-white'
                                    }`}>
                                        {metric.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold">{metric.value}{metric.unit}</span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        閾値: {metric.threshold}{metric.unit}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-full rounded-full ${
                                            metric.status === 'GOOD'
                                                ? 'bg-green-600'
                                                : metric.status === 'WARNING'
                                                    ? 'bg-yellow-600'
                                                    : 'bg-red-600'
                                        }`}
                                        style={{
                                            width: `${Math.min(
                                                (Math.abs(metric.value) / Math.abs(metric.threshold)) * 100,
                                                100
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-3">リスク推移</h3>
                    <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={riskHistory}>
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
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
                                <Bar dataKey="totalRisk" fill="#3b82f6" name="総リスク" />
                                <Bar dataKey="maxExposure" fill="#ef4444" name="最大エクスポージャー" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">現在の総リスク</div>
                            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalRisk.toFixed(2)}</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">制限リスク</div>
                            <div className="text-xl font-bold text-red-700 dark:text-red-300">{settings.maxTotalExposure * 0.01}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    ポジション別リスク
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="p-2 text-left">シンボル</th>
                                <th className="p-2 text-right">評価額</th>
                                <th className="p-2 text-right">配分</th>
                                <th className="p-2 text-right">ベータ</th>
                                <th className="p-2 text-right">リスク</th>
                                <th className="p-2 text-center">アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positionRisks.map(pos => (
                                <tr key={pos.symbol} className="border-b border-gray-200 dark:border-gray-700">
                                    <td className="p-2 font-medium">{pos.symbol}</td>
                                    <td className="p-2 text-right">¥{pos.value.toLocaleString()}</td>
                                    <td className="p-2 text-right">{pos.allocation}%</td>
                                    <td className="p-2 text-right">{pos.beta.toFixed(2)}</td>
                                    <td className={`p-2 text-right font-semibold ${pos.risk > 1 ? 'text-red-600' : 'text-green-600'}`}>
                                        {pos.risk.toFixed(2)}
                                    </td>
                                    <td className="p-2 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${actionColors[pos.action]}`}>
                                            {pos.action === 'REDUCE' ? '縮小' : pos.action === 'INCREASE' ? '拡大' : '維持'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showSettings && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-md">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        リスク管理設定
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">最大ポジションサイズ（%）</label>
                            <input
                                type="number"
                                value={settings.maxPositionSize}
                                onChange={(e) => updateSetting('maxPositionSize', Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">最大セクター配分（%）</label>
                            <input
                                type="number"
                                value={settings.maxSectorAllocation}
                                onChange={(e) => updateSetting('maxSectorAllocation', Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ボラティリティ閾値</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settings.volatilityThreshold}
                                onChange={(e) => updateSetting('volatilityThreshold', Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ドローダウン制限（%）</label>
                            <input
                                type="number"
                                value={settings.drawdownLimit}
                                onChange={(e) => updateSetting('drawdownLimit', Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>
                </div>
            )}

            {autoAdjust && (
                <div className="flex justify-center">
                    <button
                        onClick={executeAutoAdjust}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md flex items-center gap-2"
                    >
                        <Calculator className="w-4 h-4" />
                        自動調整を実行
                    </button>
                </div>
            )}
        </div>
    );
}

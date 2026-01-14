'use client';

import { useState } from 'react';
import { Brain, TrendingUp, Shield, Target, AlertTriangle, Info } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsData {
    totalValue: number;
    totalReturn: number;
    monthlyReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
    alpha: number;
    volatility: number;
}

interface AIInsight {
    type: 'OPPORTUNITY' | 'RISK' | 'REBALANCE' | 'OPTIMIZATION';
    title: string;
    description: string;
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface PortfolioAnalyticsProps {
    data: AnalyticsData;
    insights: AIInsight[];
}

export function PortfolioAnalytics({ data, insights }: PortfolioAnalyticsProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
    const [showInsights, setShowInsights] = useState(true);

    const mockChartData = [
        { month: '1月', value: data.totalValue * 0.95 },
        { month: '2月', value: data.totalValue * 0.97 },
        { month: '3月', value: data.totalValue * 0.96 },
        { month: '4月', value: data.totalValue * 0.99 },
        { month: '5月', value: data.totalValue },
        { month: '6月', value: data.totalValue * 1.02 },
        { month: '7月', value: data.totalValue * 1.01 },
        { month: '8月', value: data.totalValue * 1.04 },
        { month: '9月', value: data.totalValue * 1.03 },
        { month: '10月', value: data.totalValue * 1.05 },
        { month: '11月', value: data.totalValue * 1.07 },
        { month: '12月', value: data.totalValue * 1.10 },
    ];

    const allocationData = [
        { name: '株式', value: 60, color: '#3b82f6' },
        { name: '債券', value: 25, color: '#10b981' },
        { name: '現金', value: 10, color: '#f59e0b' },
        { name: 'その他', value: 5, color: '#8b5cf6' },
    ];

    const riskReturnData = [
        { name: '期待リターン', value: data.monthlyReturn * 12 },
        { name: 'リスク（標準偏差）', value: data.volatility * 100 },
    ];

    const priorityColors = {
        HIGH: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
        MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
        LOW: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h2 className="text-xl font-semibold">AI Portfolio Analytics</h2>
                </div>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    className="px-3 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="1M">1ヶ月</option>
                    <option value="3M">3ヶ月</option>
                    <option value="6M">6ヶ月</option>
                    <option value="1Y">1年</option>
                    <option value="ALL">全期間</option>
                </select>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">総評価額</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        ¥{data.totalValue.toLocaleString()}
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">総リターン</div>
                    <div className={`text-2xl font-bold ${data.totalReturn >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {data.totalReturn >= 0 ? '+' : ''}{data.totalReturn.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-md">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">シャープレシオ</div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {data.sharpeRatio.toFixed(2)}
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">最大ドローダウン</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        -{data.maxDrawdown.toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-md">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        パフォーマンストレンド
                    </h3>
                    <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={mockChartData}>
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${(v / 1000000).toFixed(1)}M`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#fff'
                                }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-md">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        資産配分
                    </h3>
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie
                                data={allocationData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name} ${((entry.value / allocationData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0)}%`}
                                outerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {allocationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-md mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    リスク・リターン分析
                </h3>
                <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={riskReturnData}>
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
                        <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">ベータ値</div>
                    <div className="text-lg font-semibold">{data.beta.toFixed(2)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">アルファ</div>
                    <div className="text-lg font-semibold">{data.alpha.toFixed(2)}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">ボラティリティ</div>
                    <div className="text-lg font-semibold">{(data.volatility * 100).toFixed(2)}%</div>
                </div>
                <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">月次リターン</div>
                    <div className="text-lg font-semibold">{data.monthlyReturn.toFixed(2)}%</div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI インサイト
                    </h3>
                    <button
                        onClick={() => setShowInsights(!showInsights)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                    >
                        {showInsights ? '非表示' : '表示'}
                    </button>
                </div>

                {showInsights && (
                    <div className="space-y-3">
                        {insights.map((insight, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-md border ${priorityColors[insight.priority]}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {insight.type === 'OPPORTUNITY' && <TrendingUp className="w-4 h-4" />}
                                    {insight.type === 'RISK' && <AlertTriangle className="w-4 h-4" />}
                                    {insight.type === 'REBALANCE' && <Target className="w-4 h-4" />}
                                    {insight.type === 'OPTIMIZATION' && <Info className="w-4 h-4" />}
                                    <span className="font-semibold">{insight.title}</span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800">
                                        {insight.priority === 'HIGH' ? '高優先度' : insight.priority === 'MEDIUM' ? '中優先度' : '低優先度'}
                                    </span>
                                </div>
                                <div className="text-sm mb-2">{insight.description}</div>
                                <div className="text-sm font-medium">{insight.action}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

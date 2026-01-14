'use client';

import { useState } from 'react';
import { Target, TrendingUp, Calculator, Calendar, AlertTriangle, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RetirementGoal {
    targetAmount: number;
    targetDate: Date;
    currentAssets: number;
    monthlyContribution: number;
    assetAllocation: {
        stocks: number;
        bonds: number;
        cash: number;
    };
    riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}

interface ProjectionScenario {
    name: string;
    expectedReturn: number;
    volatility: number;
    probability: number;
    projection: number[];
}

export function RetirementPlanner() {
    const [goal, setGoal] = useState<RetirementGoal>({
        targetAmount: 50000000,
        targetDate: new Date(Date.now() + 20 * 365 * 24 * 60 * 60 * 1000),
        currentAssets: 5000000,
        monthlyContribution: 50000,
        assetAllocation: { stocks: 60, bonds: 30, cash: 10 },
        riskTolerance: 'MODERATE'
    });

    const [isCalculating, setIsCalculating] = useState(false);
    const [scenarios, setScenarios] = useState<ProjectionScenario[]>([]);

    const calculateProjections = () => {
        setIsCalculating(true);

        setTimeout(() => {
            const monthsToRetirement = Math.ceil(
                (goal.targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
            );

            const scenarios: ProjectionScenario[] = [
                {
                    name: '保守的',
                    expectedReturn: 0.04,
                    volatility: 0.08,
                    probability: 90,
                    projection: Array.from({ length: monthsToRetirement }, (_, i) => {
                        const years = i / 12;
                        return goal.currentAssets * Math.pow(1.04, years) +
                            goal.monthlyContribution * 12 * years;
                    })
                },
                {
                    name: '標準',
                    expectedReturn: 0.06,
                    volatility: 0.12,
                    probability: 70,
                    projection: Array.from({ length: monthsToRetirement }, (_, i) => {
                        const years = i / 12;
                        return goal.currentAssets * Math.pow(1.06, years) +
                            goal.monthlyContribution * 12 * years;
                    })
                },
                {
                    name: '積極的',
                    expectedReturn: 0.08,
                    volatility: 0.18,
                    probability: 50,
                    projection: Array.from({ length: monthsToRetirement }, (_, i) => {
                        const years = i / 12;
                        return goal.currentAssets * Math.pow(1.08, years) +
                            goal.monthlyContribution * 12 * years;
                    })
                }
            ];

            setScenarios(scenarios);
            setIsCalculating(false);
        }, 1000);
    };

    const yearsToRetirement = Math.max(0,
        (goal.targetDate.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000)
    );

    const monthlySavingsRequired = (
        (goal.targetAmount - goal.currentAssets) /
        (yearsToRetirement * 12)
    );

    const conservativeGoal = scenarios[0]?.projection[scenarios[0]?.projection.length - 1] || 0;
    const standardGoal = scenarios[1]?.projection[scenarios[1]?.projection.length - 1] || 0;
    const aggressiveGoal = scenarios[2]?.projection[scenarios[2]?.projection.length - 1] || 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5" />
                <h2 className="text-xl font-semibold">リタイヤメント計画</h2>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">目標金額</label>
                        <input
                            type="number"
                            value={goal.targetAmount}
                            onChange={(e) => setGoal({ ...goal, targetAmount: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">リタイヤメント日</label>
                        <input
                            type="date"
                            value={goal.targetDate.toISOString().split('T')[0]}
                            onChange={(e) => setGoal({ ...goal, targetDate: new Date(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">現在資産</label>
                        <input
                            type="number"
                            value={goal.currentAssets}
                            onChange={(e) => setGoal({ ...goal, currentAssets: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">月間積立額</label>
                        <input
                            type="number"
                            value={goal.monthlyContribution}
                            onChange={(e) => setGoal({ ...goal, monthlyContribution: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">リスク許容度</label>
                        <select
                            value={goal.riskTolerance}
                            onChange={(e) => setGoal({ ...goal, riskTolerance: e.target.value as any })}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="CONSERVATIVE">保守的</option>
                            <option value="MODERATE">標準</option>
                            <option value="AGGRESSIVE">積極的</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={calculateProjections}
                    disabled={isCalculating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Calculator className="w-4 h-4" />
                    {isCalculating ? '計算中...' : 'シナリオを計算'}
                </button>

                {scenarios.length > 0 && (
                    <div className="space-y-6 border-t pt-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                <div className="text-sm text-gray-600 dark:text-gray-400">目標まで</div>
                                <div className="text-xl font-bold flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    {yearsToRetirement}年
                                </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                                <div className="text-sm text-gray-600 dark:text-gray-400">必要積立額</div>
                                <div className="text-xl font-bold">
                                    ¥{Number(monthlySavingsRequired).toLocaleString()}/月
                                </div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md">
                                <div className="text-sm text-gray-600 dark:text-gray-400">達成確率</div>
                                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                                    {scenarios[1].probability}%
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                シナリオ別プロジェクション
                            </h3>

                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={scenarios.map(s => ({
                                    year: Math.round(s.projection.length / 12),
                                    ...s
                                }))}>
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={(v) => `¥${(v / 1000000).toFixed(1)}M`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(0,0,0,0.8)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: '#fff'
                                        }}
                                    />
                                    <Legend />
                                    {scenarios.map((s, i) => (
                                        <Line
                                            key={i}
                                            type="monotone"
                                            dataKey={`scenario_${i}`}
                                            stroke={['#3b82f6', '#10b981', '#f59e0b'][i]}
                                            strokeWidth={2}
                                            name={s.name}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                                <Info className="w-4 h-4" />
                                <span className="font-medium">分析結果</span>
                            </div>
                            <div className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                                <p>• 標準シナリオで、目標金額{goal.targetAmount.toLocaleString()}円に達するには、毎月{monthlySavingsRequired}円の積立が必要です</p>
                                <p>• 保守的シナリオ: {conservativeGoal.toLocaleString()}円（確率90%）</p>
                                <p>• 標準シナリオ: {standardGoal.toLocaleString()}円（確率70%）</p>
                                <p>• 積極的シナリオ: {aggressiveGoal.toLocaleString()}円（確率50%）</p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md">
                            <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-medium">注意事項</span>
                            </div>
                            <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                                <li>• シミュレーションは過去のデータに基づく概算です</li>
                                <li>• インフレ率、税金、市場変動を考慮していません</li>
                                <li>• 実際のリターンは予想と異なる場合があります</li>
                                <li>• 専門家への相談をお勧めします</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

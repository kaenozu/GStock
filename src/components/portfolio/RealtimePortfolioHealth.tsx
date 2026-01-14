'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Shield, Zap, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PortfolioHealthMetrics {
    overall: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    score: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    diversification: number;
    liquidity: number;
    volatility: number;
    drawdown: number;
}

interface HealthAlert {
    id: string;
    type: 'RISK' | 'OPPORTUNITY' | 'WARNING';
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    title: string;
    description: string;
    action: string;
    timestamp: Date;
}

export function RealtimePortfolioHealth() {
    const [metrics, setMetrics] = useState<PortfolioHealthMetrics>({
        overall: 'GOOD',
        score: 75,
        riskLevel: 'MEDIUM',
        diversification: 70,
        liquidity: 80,
        volatility: 0.15,
        drawdown: -5.2,
    });

    const [alerts, setAlerts] = useState<HealthAlert[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<'1H' | '1D' | '1W' | '1M'>('1D');

    useEffect(() => {
        const generateAlert = () => {
            const random = Math.random();

            if (random < 0.1) {
                setAlerts(prev => [{
                    id: Date.now().toString(),
                    type: 'RISK',
                    severity: 'CRITICAL',
                    title: 'ボラティリティが上昇中',
                    description: 'ポートフォリオのボラティリティが過去30日間の平均を25%超えています',
                    action: 'ポジションサイズを縮小するか、ヘッジポジションを検討してください',
                    timestamp: new Date(),
                }, ...prev.slice(0, 9)]);
            } else if (random < 0.2) {
                setAlerts(prev => [{
                    id: Date.now().toString(),
                    type: 'OPPORTUNITY',
                    severity: 'INFO',
                    title: '配分再調整の機会',
                    description: '株式の配分が目標より5%乖離しています',
                    action: '自動リバランスを実行するか、手動で調整してください',
                    timestamp: new Date(),
                }, ...prev.slice(0, 9)]);
            } else if (random < 0.3) {
                setAlerts(prev => [{
                    id: Date.now().toString(),
                    type: 'WARNING',
                    severity: 'WARNING',
                    title: '集中度が上昇中',
                    description: '上位3銘柄がポートフォリオの60%を占めています',
                    action: '分散投資を検討してください',
                    timestamp: new Date(),
                }, ...prev.slice(0, 9)]);
            }
        };

        const interval = setInterval(generateAlert, 30000);
        return () => clearInterval(interval);
    }, []);

    const healthScoreHistory = [
        { time: '0分', score: 75 },
        { time: '15分', score: 76 },
        { time: '30分', score: 74 },
        { time: '45分', score: 75 },
        { time: '60分', score: 77 },
    ];

    const overallColors = {
        EXCELLENT: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-400 dark:border-green-600',
        GOOD: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-600',
        FAIR: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-400 dark:border-yellow-600',
        POOR: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-400 dark:border-red-600',
    };

    const riskColors = {
        LOW: 'bg-green-500',
        MEDIUM: 'bg-yellow-500',
        HIGH: 'bg-orange-500',
        CRITICAL: 'bg-red-500',
    };

    const alertIcons = {
        RISK: <AlertTriangle className="w-5 h-5" />,
        OPPORTUNITY: <TrendingUp className="w-5 h-5" />,
        WARNING: <Zap className="w-5 h-5" />,
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <h2 className="text-xl font-semibold">ポートフォリオヘルス</h2>
                </div>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    className="px-3 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="1H">1時間</option>
                    <option value="1D">1日</option>
                    <option value="1W">1週間</option>
                    <option value="1M">1ヶ月</option>
                </select>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-md border-2 ${overallColors[metrics.overall]}`}>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">総合ヘルス</div>
                    <div className="text-3xl font-bold">{metrics.overall}</div>
                    <div className="text-sm mt-1">スコア: {metrics.score}/100</div>
                </div>
                <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-900/20">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">リスクレベル</div>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${riskColors[metrics.riskLevel]}`} />
                        <span className="text-lg font-semibold">{metrics.riskLevel}</span>
                    </div>
                </div>
                <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-900/20">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">ボラティリティ</div>
                    <div className="text-lg font-semibold">{(metrics.volatility * 100).toFixed(2)}%</div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">分散度</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{metrics.diversification}%</div>
                </div>
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">流動性</div>
                    <div className="text-xl font-bold text-green-700 dark:text-green-300">{metrics.liquidity}%</div>
                </div>
                <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-900/20">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">ドローダウン</div>
                    <div className="text-xl font-bold text-purple-700 dark:text-purple-300">{metrics.drawdown}%</div>
                </div>
                <div className="p-3 rounded-md bg-orange-50 dark:bg-orange-900/20">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">シャープレシオ</div>
                    <div className="text-xl font-bold text-orange-700 dark:text-orange-300">{(metrics.score / 100 * 2).toFixed(2)}</div>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    ヘルス推移
                </h3>
                <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={healthScoreHistory}>
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff'
                            }}
                        />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        リアルタイムアラート
                    </h3>
                    <button
                        onClick={() => setAlerts([])}
                        className="text-sm text-blue-600 hover:text-blue-700"
                    >
                        全てクリア
                    </button>
                </div>

                <div className="space-y-2">
                    {alerts.map(alert => (
                        <div
                            key={alert.id}
                            className={`p-3 rounded-md border ${
                                alert.severity === 'CRITICAL'
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
                                    : alert.severity === 'WARNING'
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600'
                                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`${
                                    alert.severity === 'CRITICAL'
                                        ? 'text-red-600 dark:text-red-200'
                                        : alert.severity === 'WARNING'
                                            ? 'text-yellow-600 dark:text-yellow-200'
                                            : 'text-blue-600 dark:text-blue-200'
                                }`}>
                                    {alertIcons[alert.type]}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{alert.title}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800">
                                            {alert.severity}
                                        </span>
                                    </div>
                                    <div className="text-sm mb-1">{alert.description}</div>
                                    <div className="text-sm font-medium">{alert.action}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {alert.timestamp.toLocaleString('ja-JP')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {alerts.length === 0 && (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                            <p>現在、アラートはありません</p>
                            <p className="text-sm mt-2">ポートフォリオは健全な状態です</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

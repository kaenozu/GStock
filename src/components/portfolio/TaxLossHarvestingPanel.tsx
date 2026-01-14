'use client';

import { useState } from 'react';
import { PiggyBank, TrendingDown, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import {
    automatedRebalance,
    TaxLossHarvestingAction,
    TaxLot,
    RebalanceStrategy
} from '@/lib/portfolio/auto-rebalance';
import { RebalanceSettings } from '@/types/portfolio';

interface TaxLossHarvestingPanelProps {
    portfolioValue: number;
    taxLots: Array<{
        symbol: string;
        quantity: number;
        costBasis: number;
        currentPrice: number;
        purchaseDate: Date;
    }>;
    onExecuteHarvest: (actions: TaxLossHarvestingAction[]) => void;
}

export function TaxLossHarvestingPanel({ portfolioValue, taxLots, onExecuteHarvest }: TaxLossHarvestingPanelProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [harvestingActions, setHarvestingActions] = useState<TaxLossHarvestingAction[]>([]);
    const [savings, setSavings] = useState<{ taxSavings: number; transactionCosts: number; netSavings: number } | null>(null);

    const runAnalysis = () => {
        setIsAnalyzing(true);

        setTimeout(() => {
            const currentPrices: Record<string, number> = {};
            taxLots.forEach(lot => {
                currentPrices[lot.symbol] = lot.currentPrice;
            });

            const settings: RebalanceSettings = {
                threshold: 5,
                minTradeAmount: 10000,
                frequency: 'MONTHLY',
                lastRebalance: null
            };

            const result = automatedRebalance(
                [],
                {},
                settings,
                taxLots.map(lot => ({
                    ...lot,
                    currentValue: lot.currentPrice,
                    unrealizedGainLoss: (lot.currentPrice - lot.costBasis) * lot.quantity,
                    gainLossPercent: ((lot.currentPrice - lot.costBasis) / lot.costBasis) * 100,
                    holdingPeriod: (Date.now() - lot.purchaseDate.getTime()) > 365 * 24 * 60 * 60 * 1000 ? 'LONG' : 'SHORT'
                })),
                currentPrices,
                {
                    name: 'Tax-Loss Harvesting',
                    description: 'Tax-optimized rebalancing with loss harvesting',
                    minThreshold: 5,
                    maxThreshold: 10,
                    frequency: 'MONTHLY',
                    enableTLH: true,
                    enableTaxOptimization: true
                }
            );

            setHarvestingActions(result.taxLossHarvesting);
            setSavings(result.estimatedSavings);
            setIsAnalyzing(false);
        }, 1000);
    };

    const handleExecute = () => {
        onExecuteHarvest(harvestingActions);
    };

    const totalLoss = harvestingActions.reduce((sum, action) => sum + action.lossAmount, 0);
    const potentialSavings = harvestingActions.reduce((sum, action) => sum + action.taxSavings, 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
                <PiggyBank className="w-5 h-5" />
                <h2 className="text-xl font-semibold">タックスロスハーベスティング</h2>
            </div>

            <div className="space-y-6">
                <div className="flex gap-2">
                    <button
                        onClick={runAnalysis}
                        disabled={isAnalyzing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                分析中...
                            </>
                        ) : (
                            <>
                                <TrendingDown className="w-4 h-4" />
                                ロス機会を分析
                            </>
                        )}
                    </button>
                </div>

                {harvestingActions.length > 0 && (
                    <div className="space-y-4 border-t pt-4">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-md">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-green-800 dark:text-green-200 font-medium">
                                        推定節税額
                                    </div>
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                        ¥{potentialSavings.toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        含み損失
                                    </div>
                                    <div className="text-lg font-semibold text-red-600">
                                        -¥{totalLoss.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {savings && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">税金節約</div>
                                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                                        ¥{savings.taxSavings.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">取引手数料</div>
                                    <div className="font-semibold text-red-700 dark:text-red-300">
                                        -¥{savings.transactionCosts.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">正味節約額</div>
                                    <div className="font-semibold text-green-700 dark:text-green-300">
                                        ¥{savings.netSavings.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="font-semibold mb-3">推奨アクション</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {harvestingActions.map((action, index) => (
                                    <div
                                        key={index}
                                        className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-md border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <div className="font-medium">{action.symbol}</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    損失ハーベスティング対象
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-600 dark:text-gray-400">含み損失</div>
                                                <div className="font-semibold text-red-600">
                                                    -¥{action.lossAmount.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <div className="text-gray-500 dark:text-gray-400">税金節約</div>
                                                <div className="font-semibold text-green-600">
                                                    ¥{action.taxSavings.toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 dark:text-gray-400">代替銘柄</div>
                                                <div className="font-semibold">{action.replacementSymbol}</div>
                                            </div>
                                        </div>

                                        {action.washSaleEndDate && (
                                            <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Wash Sale期間: {action.washSaleEndDate.toLocaleDateString()} まで同銘柄購入不可
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleExecute}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            タックスロスハーベスティングを実行
                        </button>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md text-sm">
                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-medium">注意事項</span>
                            </div>
                            <ul className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                                <li>• 代替ETFに再投資する際の手数料を考慮してください</li>
                                <li>• Wash Sale規則（30日間の再購入禁止）を遵守してください</li>
                                <li>• タックスロスハーベスティングは投資助言であり、税務助言ではありません</li>
                            </ul>
                        </div>
                    </div>
                )}

                {harvestingActions.length === 0 && !isAnalyzing && (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                        <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>現在、タックスロスハーベスティングの機会はありません</p>
                        <p className="text-sm mt-2">価格が下落した際に再度分析してください</p>
                    </div>
                )}
            </div>
        </div>
    );
}

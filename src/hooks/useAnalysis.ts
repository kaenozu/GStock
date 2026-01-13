'use client';

import { useState, useCallback } from 'react';
import { AnalysisResult, ChartSettings } from '@/types/market';
import { BacktestReport } from '@/lib/backtest/BacktestArena';
import { OptimizationResult } from '@/lib/optimization/Optimizer';

const DEFAULT_CHART_SETTINGS: ChartSettings = {
    showSMA20: true,
    showSMA50: true,
    showBollingerBands: false,
    showPredictions: false
};

export const useAnalysis = () => {
    const [bestTrade, setBestTrade] = useState<AnalysisResult | null>(null);
    const [showIndicators, setShowIndicators] = useState(false);
    const [chartSettings, setChartSettings] = useState<ChartSettings>(DEFAULT_CHART_SETTINGS);

    // Deep Backtest State
    const [deepReport, setDeepReport] = useState<BacktestReport | null>(null);
    const [isBacktestLoading, setIsBacktestLoading] = useState(false);

    // Optimization State
    const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[] | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const updateBestTrade = useCallback((analysis: AnalysisResult | null) => {
        if (!analysis) return;
        // Always update with the latest analysis to ensure fresh chart data
        setBestTrade(analysis);
    }, []);

    const runDeepBacktest = useCallback(async (symbol: string, period: string = '1y', config?: { riskPercent: number, maxPosPercent: number }) => {
        setIsBacktestLoading(true);
        setDeepReport(null);

        try {
            const res = await fetch('/api/backtest-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, period, config })
            });

            if (!res.ok) throw new Error('Backtest failed');

            const data = await res.json();
            setDeepReport(data);

        } catch (error) {
            console.error('Deep Backtest Error:', error);
        } finally {
            setIsBacktestLoading(false);
        }
    }, []);

    const runOptimization = useCallback(async (symbol: string, period: string = '1y') => {
        setIsOptimizing(true);
        setOptimizationResults(null);

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, period })
            });

            if (!res.ok) throw new Error('Optimization failed');

            const data = await res.json();
            setOptimizationResults(data.results);
        } catch (error) {
            console.error('Optimization Error:', error);
        } finally {
            setIsOptimizing(false);
        }
    }, []);

    return {
        bestTrade,
        showIndicators,
        setShowIndicators,
        updateBestTrade,
        chartSettings,
        setChartSettings,
        deepReport,
        isBacktestLoading,
        runDeepBacktest,
        setDeepReport,
        runOptimization,
        isOptimizing,
        optimizationResults
    };
};

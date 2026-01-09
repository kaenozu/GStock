'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { StockDataPoint, PredictionPoint, ChartIndicators } from '@/types/market';

interface ChartProps {
    data: StockDataPoint[];
    predictionData?: PredictionPoint[];
    indicators?: ChartIndicators;
}

const StockChart: React.FC<ChartProps> = ({ data, predictionData, indicators }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        let chart: IChartApi;
        try {
            chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: '#94a3b8',
                },
                grid: {
                    vertLines: { color: 'rgba(148, 163, 184, 0.05)' },
                    horzLines: { color: 'rgba(148, 163, 184, 0.05)' },
                },
                width: chartContainerRef.current.clientWidth,
                height: 400,
            });
            chartRef.current = chart;
        } catch (e) {
            console.error('Failed to create chart instance:', e);
            return;
        }

        const initSeries = () => {
            if (!chart) return;

            try {
                // v5 API: addSeriesを使用
                const candlestickSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderVisible: false,
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });

                if (data && data.length > 0) {
                    candlestickSeries.setData(data);

                    // ユーザー要望: 予測線（未来14日分）が見えるところまで表示範囲を調整
                    // 過去15日 + 未来15日（予測期間＋余白）を表示
                    chart.timeScale().setVisibleLogicalRange({
                        from: data.length - 15,
                        to: data.length + 15,
                    });
                }

                if (indicators) {
                    // SMA20
                    if (indicators.sma20.length > 0) {
                        const sma20Series = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1 });
                        sma20Series.setData(indicators.sma20);
                    }
                    // SMA50
                    if (indicators.sma50.length > 0) {
                        const sma50Series = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1 });
                        sma50Series.setData(indicators.sma50);
                    }
                    // Bollinger Bands
                    if (indicators.upperBand.length > 0) {
                        const upperSeries = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.5)', lineWidth: 1, lineStyle: 2 });
                        upperSeries.setData(indicators.upperBand);
                    }
                    if (indicators.lowerBand.length > 0) {
                        const lowerSeries = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.5)', lineWidth: 1, lineStyle: 2 });
                        lowerSeries.setData(indicators.lowerBand);
                    }
                }

                if (predictionData && predictionData.length > 0) {
                    const predictionSeries = chart.addSeries(LineSeries, {
                        color: '#06b6d4',
                        lineWidth: 2,
                        lineStyle: 2, // Dotted
                    });
                    predictionSeries.setData(predictionData);
                }
            } catch (e) {
                console.error('Error adding series to chart:', e);
            }
        };

        initSeries();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                    chartRef.current = null;
                } catch (e) {
                    console.error('Error during chart cleanup:', e);
                }
            }
        };
    }, [data, predictionData, indicators]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />;
};

export default StockChart;

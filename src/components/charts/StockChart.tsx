'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface ChartProps {
    data: any[];
    predictionData?: any[];
}

const StockChart: React.FC<ChartProps> = ({ data, predictionData }) => {
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
                const candlestickSeries = chart.addCandlestickSeries({
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderVisible: false,
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });

                if (data && data.length > 0) {
                    candlestickSeries.setData(data);
                }

                if (predictionData && predictionData.length > 0) {
                    const predictionSeries = chart.addLineSeries({
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
    }, [data, predictionData]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />;
};

export default StockChart;

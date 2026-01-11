'use client';

<<<<<<< HEAD
import React, { useEffect, useRef, useState, useCallback } from 'react';
=======
import React, { useEffect, useRef } from 'react';
>>>>>>> origin/main
import { createChart, ColorType, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { StockDataPoint, PredictionPoint, ChartIndicators, ChartMarker, ChartSettings } from '@/types/market';
import { EarningsOverlay, EarningsMarker } from './EarningsOverlay';

interface ChartProps {
    data: StockDataPoint[];
    predictionData?: PredictionPoint[];
    indicators?: ChartIndicators;
    markers?: ChartMarker[];
    settings?: ChartSettings;
    earningsDate?: string | null;  // YYYY-MM-DD format
    earningsTooltip?: string;
}

<<<<<<< HEAD
const StockChart: React.FC<ChartProps> = React.memo(({ data, predictionData, indicators, markers, settings, earningsDate, earningsTooltip }) => {
=======
const StockChart: React.FC<ChartProps> = React.memo(function StockChart({ data, predictionData, indicators, markers, settings }) {
>>>>>>> origin/main
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [earningsMarkers, setEarningsMarkers] = useState<EarningsMarker[]>([]);

    // Calculate marker positions when chart updates
    const updateMarkerPositions = useCallback(() => {
        if (!chartRef.current || !earningsDate) {
            setEarningsMarkers([]);
            return;
        }

        try {
            const timeScale = chartRef.current.timeScale();
            const x = timeScale.timeToCoordinate(earningsDate as any);

            if (x !== null && x >= 0) {
                setEarningsMarkers([{
                    date: earningsDate,
                    x: x,
                    label: 'E',
                    tooltip: earningsTooltip || `Earnings: ${earningsDate}`,
                }]);
            } else {
                setEarningsMarkers([]);
            }
        } catch {
            setEarningsMarkers([]);
        }
    }, [earningsDate, earningsTooltip]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
            updateMarkerPositions();
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

            // Subscribe to visible range changes to update marker positions
            chart.timeScale().subscribeVisibleLogicalRangeChange(updateMarkerPositions);
        } catch (e) {
            console.error('Failed to create chart instance:', e);
            return;
        }

        const initSeries = () => {
            if (!chart) return;

            try {
                const candlestickSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderVisible: false,
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });

                console.log('[StockChart] Data received:', data?.length, 'points');
                if (data && data.length > 0) {
                    candlestickSeries.setData(data);
                    console.log('[StockChart] Chart data set successfully');

                    chart.timeScale().setVisibleLogicalRange({
                        from: data.length - 20,
                        to: data.length + 15,
                    });
                }

                const showSMA20 = settings ? settings.showSMA20 : true;
                const showSMA50 = settings ? settings.showSMA50 : true;
                const showBB = settings ? settings.showBollingerBands : true;
                const showPred = settings ? settings.showPredictions : true;

                if (indicators) {
                    if (showSMA20 && indicators.sma20.length > 0) {
                        const sma20Series = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1 });
                        sma20Series.setData(indicators.sma20);
                    }
                    if (showSMA50 && indicators.sma50.length > 0) {
                        const sma50Series = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1 });
                        sma50Series.setData(indicators.sma50);
                    }
                    if (showBB) {
                        if (indicators.upperBand.length > 0) {
                            const upperSeries = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.5)', lineWidth: 1, lineStyle: 2 });
                            upperSeries.setData(indicators.upperBand);
                        }
                        if (indicators.lowerBand.length > 0) {
                            const lowerSeries = chart.addSeries(LineSeries, { color: 'rgba(139, 92, 246, 0.5)', lineWidth: 1, lineStyle: 2 });
                            lowerSeries.setData(indicators.lowerBand);
                        }
                    }
                }

                if (showPred && predictionData && predictionData.length > 0) {
                    const predictionSeries = chart.addSeries(LineSeries, {
                        color: '#06b6d4',
                        lineWidth: 2,
                        lineStyle: 2,
                    });
                    predictionSeries.setData(predictionData);
                }

                // Update marker positions after data is loaded
                setTimeout(updateMarkerPositions, 100);
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
    }, [data, predictionData, indicators, markers, settings, updateMarkerPositions]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '400px' }}>
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
            <EarningsOverlay markers={earningsMarkers} chartHeight={400} />
        </div>
    );
});

export default StockChart;
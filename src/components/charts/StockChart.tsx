'use client';

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createChart, ColorType, IChartApi, CandlestickSeries, LineSeries, ISeriesApi } from 'lightweight-charts';
import { StockDataPoint, PredictionPoint, ChartIndicators, ChartMarker, ChartSettings } from '@/types/market';
import { useChartWorker } from '@/hooks/useChartWorker';

interface ChartProps {
    data: StockDataPoint[];
    predictionData?: PredictionPoint[];
    indicators?: ChartIndicators;
    markers?: ChartMarker[];
    settings?: ChartSettings;
}

const StockChart: React.FC<ChartProps> = React.memo(({ data, predictionData, indicators, markers, settings }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<{
        candlestick?: ISeriesApi<'Candlestick'>;
        sma20?: ISeriesApi<'Line'>;
        sma50?: ISeriesApi<'Line'>;
        upperBand?: ISeriesApi<'Line'>;
        lowerBand?: ISeriesApi<'Line'>;
        prediction?: ISeriesApi<'Line'>;
    }>({});
    const [workerIndicators, setWorkerIndicators] = useState<ChartIndicators>({ sma20: [], sma50: [], upperBand: [], lowerBand: [] });

    const { initWorker, updateData, calculateIndicator, onDataUpdated, onIndicatorsCalculated, terminateWorker } = useChartWorker();

    const normalizedSettings = useMemo(() => ({
        showSMA20: settings?.showSMA20 ?? true,
        showSMA50: settings?.showSMA50 ?? true,
        showBollingerBands: settings?.showBollingerBands ?? false,
        showPredictions: settings?.showPredictions ?? false,
    }), [settings]);

    const handleResize = useCallback(() => {
        if (chartRef.current && chartContainerRef.current) {
            chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
    }, []);

    useEffect(() => {
        if (!chartContainerRef.current) return;

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

            onDataUpdated((processedData) => {
                if (seriesRef.current.candlestick) {
                    seriesRef.current.candlestick.setData(processedData);
                }
            });

            onIndicatorsCalculated((result) => {
                const newIndicators = { ...workerIndicators };
                switch (result.indicator) {
                    case 'SMA':
                        if (result.indicator === 'SMA' && normalizedSettings.showSMA20) {
                            newIndicators.sma20 = result.result;
                        }
                        break;
                    case 'BB':
                        if (normalizedSettings.showBollingerBands) {
                            newIndicators.upperBand = result.result;
                        }
                        break;
                }
                setWorkerIndicators(newIndicators);
            });

            initWorker('STOCK');
        } catch (e) {
            console.error('Failed to create chart instance:', e);
            return;
        }

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
            terminateWorker();
        };
    }, [handleResize, normalizedSettings, onDataUpdated, onIndicatorsCalculated, initWorker, terminateWorker, workerIndicators]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const updateCandlestickSeries = () => {
            if (!seriesRef.current.candlestick) {
                seriesRef.current.candlestick = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderVisible: false,
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });
            }

            if (data && data.length > 0) {
                updateData(data);
                seriesRef.current.candlestick.setData(data);

                chart.timeScale().setVisibleLogicalRange({
                    from: data.length - 20,
                    to: data.length + 15,
                });

                if (normalizedSettings.showSMA20) {
                    calculateIndicator('SMA', 20);
                }
                if (normalizedSettings.showSMA50) {
                    calculateIndicator('SMA', 50);
                }
                if (normalizedSettings.showBollingerBands) {
                    calculateIndicator('BB', 20);
                }
            }
        };

        updateCandlestickSeries();
    }, [data, normalizedSettings, updateData, calculateIndicator]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const effectiveIndicators = indicators ?? workerIndicators;

        const updateIndicators = () => {
            const { sma20, sma50, upperBand, lowerBand } = seriesRef.current;

            if (normalizedSettings.showSMA20) {
                if (!sma20 && effectiveIndicators.sma20.length > 0) {
                    seriesRef.current.sma20 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1 });
                }
                if (seriesRef.current.sma20) {
                    seriesRef.current.sma20.setData(effectiveIndicators.sma20);
                }
            } else if (sma20) {
                sma20.setData([]);
            }

            if (normalizedSettings.showSMA50) {
                if (!sma50 && effectiveIndicators.sma50.length > 0) {
                    seriesRef.current.sma50 = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 1 });
                }
                if (seriesRef.current.sma50) {
                    seriesRef.current.sma50.setData(effectiveIndicators.sma50);
                }
            } else if (sma50) {
                sma50.setData([]);
            }

            if (normalizedSettings.showBollingerBands) {
                if (!upperBand && effectiveIndicators.upperBand.length > 0) {
                    seriesRef.current.upperBand = chart.addSeries(LineSeries, {
                        color: 'rgba(139, 92, 246, 0.5)',
                        lineWidth: 1,
                        lineStyle: 2
                    });
                }
                if (seriesRef.current.upperBand) {
                    seriesRef.current.upperBand.setData(effectiveIndicators.upperBand);
                }

                if (!lowerBand && effectiveIndicators.lowerBand.length > 0) {
                    seriesRef.current.lowerBand = chart.addSeries(LineSeries, {
                        color: 'rgba(139, 92, 246, 0.5)',
                        lineWidth: 1,
                        lineStyle: 2
                    });
                }
                if (seriesRef.current.lowerBand) {
                    seriesRef.current.lowerBand.setData(effectiveIndicators.lowerBand);
                }
            } else {
                if (upperBand) upperBand.setData([]);
                if (lowerBand) lowerBand.setData([]);
            }
        };

        updateIndicators();
    }, [indicators, workerIndicators, normalizedSettings]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const updatePrediction = () => {
            if (normalizedSettings.showPredictions && predictionData && predictionData.length > 0) {
                if (!seriesRef.current.prediction) {
                    seriesRef.current.prediction = chart.addSeries(LineSeries, {
                        color: '#06b6d4',
                        lineWidth: 2,
                        lineStyle: 2,
                    });
                }
                seriesRef.current.prediction?.setData(predictionData);
            } else if (seriesRef.current.prediction) {
                seriesRef.current.prediction.setData([]);
            }
        };

        updatePrediction();
    }, [predictionData, normalizedSettings.showPredictions]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />;
}, (prevProps, nextProps) => {
    return (
        prevProps.data === nextProps.data &&
        prevProps.predictionData === nextProps.predictionData &&
        prevProps.indicators === nextProps.indicators &&
        prevProps.markers === nextProps.markers &&
        prevProps.settings === nextProps.settings
    );
});

export default StockChart;
import axios from 'axios';
import { StockDataPoint } from '@/types/market';

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || 'demo';

// 開発/デモ用のダミーデータを生成するヘルパー
const generateMockData = (symbol: string): StockDataPoint[] => {
    const data: StockDataPoint[] = [];

    // ランダムなトレンド決定 (シミュレーションの多様化)
    // 0: Strong Bullish, 1: Bullish, 2: Bearish, 3: Strong Bearish, 4: Neutral
    const trendType = Math.floor(Math.random() * 5);

    // ランダムな開始価格 (100 - 500)
    let currentPrice = 100 + Math.random() * 400;

    // ボラティリティ (価格変動の激しさ)
    const volatility = 0.01 + Math.random() * 0.02; // 1% - 3%

    for (let i = 100; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // 土日はスキップしない（簡易実装のため）

        // トレンドごとの価格変動
        let changePercent = (Math.random() - 0.5) * volatility; // 基本はランダムウォーク

        if (trendType === 0) changePercent += 0.005; // 強気
        if (trendType === 1) changePercent += 0.002; // やや強気
        if (trendType === 2) changePercent -= 0.002; // やや弱気
        if (trendType === 3) changePercent -= 0.005; // 弱気
        // trendType 4 (Neutral) はランダムのみ

        // 価格更新
        currentPrice = currentPrice * (1 + changePercent);

        // 異常値防止
        if (currentPrice < 1) currentPrice = 1;

        data.push({
            time: date.toISOString().split('T')[0],
            open: parseFloat((currentPrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)),
            high: parseFloat((currentPrice * (1 + Math.random() * 0.02)).toFixed(2)),
            low: parseFloat((currentPrice * (1 - Math.random() * 0.02)).toFixed(2)),
            close: parseFloat(currentPrice.toFixed(2)),
        });
    }
    return data;
};

export const fetchStockData = async (symbol: string): Promise<StockDataPoint[]> => {
    try {
        const response = await axios.get(`https://www.alphavantage.co/query`, {
            params: {
                function: 'TIME_SERIES_DAILY',
                symbol: symbol,
                apikey: ALPHA_VANTAGE_API_KEY,
            },
            timeout: 5000
        });

        const timeSeries = response.data['Time Series (Daily)'];

        // API制限またはデモキーで未対応の銘柄の場合
        if (!timeSeries || response.data['Note'] || response.data['Error Message']) {
            console.error(`Alpha Vantage API Error for ${symbol}:`, response.data);
            // モックデータは使用しない（ユーザー要望により廃止）
            return [];
        }

        return Object.keys(timeSeries)
            .map((date) => ({
                time: date,
                open: parseFloat(timeSeries[date]['1. open']),
                high: parseFloat(timeSeries[date]['2. high']),
                low: parseFloat(timeSeries[date]['3. low']),
                close: parseFloat(timeSeries[date]['4. close']),
            }))
            .reverse();
    } catch (error) {
        console.error(`Fetch error for ${symbol}:`, error);
        // モックデータは使用しない
        return [];
    }
};

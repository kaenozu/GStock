import axios from 'axios';

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || 'demo';

// 開発/デモ用のダミーデータを生成するヘルパー
const generateMockData = (symbol: string) => {
    const data = [];
    const basePrice = symbol.includes('NVDA') ? 140 : symbol.includes('TSLA') ? 250 : 200;

    for (let i = 100; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayPrice = basePrice + Math.sin(i / 10) * 10 + (100 - i) * 0.5;
        data.push({
            time: date.toISOString().split('T')[0],
            open: dayPrice - 2,
            high: dayPrice + 5,
            low: dayPrice - 4,
            close: dayPrice,
        });
    }
    return data;
};

export const fetchStockData = async (symbol: string) => {
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
            console.warn(`Alpha Vantage API Limit/Error for ${symbol}. Falling back to high-fidelity mock data.`);
            return generateMockData(symbol);
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
        console.error(`Fetch error for ${symbol}, switching to mock data:`, error);
        return generateMockData(symbol);
    }
};

import axios from 'axios';
import { StockDataPoint } from '@/types/market';

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || 'demo';

const CACHE_KEY_PREFIX = 'gstock_cache_v2_';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24時間

// 開発/デモ用のダミーデータを生成するヘルパー
const generateMockData = (symbol: string): StockDataPoint[] => {
    const data: StockDataPoint[] = [];
    // NVDAを強力な上昇トレンド（BUYシグナル）として設定
    const isBullish = symbol.includes('NVDA');
    const basePrice = symbol.includes('NVDA') ? 100 : symbol.includes('TSLA') ? 250 : 200;

    for (let i = 100; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // NVDAは右肩上がり、その他はランダム/下落気味
        let dayPrice;
        if (isBullish) {
            // 超強力な上昇トレンド: 毎日確実に上昇させる
            // i=100 (過去) -> i=0 (現在)
            // basePrice から毎日 3% 程度上昇する複利計算のようなイメージで
            dayPrice = basePrice * Math.pow(1.01, 100 - i);
            
            // 少しノイズを入れないと計算エラーになる指標があるかもしれないので微小な乱数
            dayPrice += Math.random() * 0.5;
        } else {
            // レンジ〜下落
            dayPrice = basePrice + Math.sin(i / 10) * 10 + (i * 0.2);
        }

        data.push({
            time: date.toISOString().split('T')[0],
            open: parseFloat((dayPrice - 2).toFixed(2)),
            high: parseFloat((dayPrice + 5).toFixed(2)),
            low: parseFloat((dayPrice - 4).toFixed(2)),
            close: parseFloat(dayPrice.toFixed(2)),
        });
    }
    return data;
};

export const fetchStockData = async (symbol: string): Promise<StockDataPoint[]> => {
    // 1. キャッシュ確認 (ブラウザ環境のみ)
    if (typeof window !== 'undefined') {
        const cacheKey = `${CACHE_KEY_PREFIX}${symbol}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                const now = Date.now();
                // キャッシュ有効期間内なら使用
                if (now - timestamp < CACHE_DURATION) {
                    console.log(`Using cached data for ${symbol}`);
                    // 念のためキャッシュデータもソートして返す
                    return (data as StockDataPoint[]).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                }
            } catch (e) {
                console.warn('Cache parse error, fetching fresh data.');
                localStorage.removeItem(cacheKey);
            }
        }
    }

    let result: StockDataPoint[] = [];

    // 2. データ取得 (日本株 or 米国株)
    try {
        if (symbol.endsWith('.T')) {
            // 日本株
            const response = await axios.get(`/api/stock?symbol=${symbol}`);
            result = response.data;
        } else {
            // 米国株 (Alpha Vantage)
            const response = await axios.get(`https://www.alphavantage.co/query`, {
                params: {
                    function: 'TIME_SERIES_DAILY',
                    symbol: symbol,
                    apikey: ALPHA_VANTAGE_API_KEY,
                },
                timeout: 5000
            });
            const timeSeries = response.data['Time Series (Daily)'];
            if (!timeSeries || response.data['Note'] || response.data['Error Message']) {
                console.error(`Alpha Vantage API Error for ${symbol}:`, response.data);
                // エラー時はモックデータを返す（フォールバック）
                return generateMockData(symbol);
            }
            result = Object.keys(timeSeries)
                .map((date) => ({
                    time: date,
                    open: parseFloat(timeSeries[date]['1. open']),
                    high: parseFloat(timeSeries[date]['2. high']),
                    low: parseFloat(timeSeries[date]['3. low']),
                    close: parseFloat(timeSeries[date]['4. close']),
                }))
                .reverse();
        }
    } catch (error) {
        console.error(`Fetch error for ${symbol}:`, error);
        // 通信エラー時もモックデータを返す（デモ用）
        return generateMockData(symbol);
    }

    // 3. キャッシュ保存 (成功時のみ)
    if (result.length > 0) {
        // バグ修正: lightweight-charts は「昇順 (Oldest -> Newest)」を要求するため強制ソートする
        result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        if (typeof window !== 'undefined') {
            const cacheKey = `${CACHE_KEY_PREFIX}${symbol}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: result
            }));
        }
    }

    return result;
};
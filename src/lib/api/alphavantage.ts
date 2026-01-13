/**
 * AlphaVantage API Client
 * @description 株価データの取得とキャッシュ管理
 * @module lib/api/alphavantage
 */

import axios from 'axios';
import { StockDataPoint } from '@/types/market';

/** キャッシュキーのプレフィックス */
const CACHE_KEY_PREFIX = 'gstock_cache_v2_';

/** キャッシュ有効期間（24時間） */
const CACHE_DURATION = 1000 * 60 * 60 * 24;

/** キャッシュデータの型 */
interface CacheData {
    timestamp: number;
    data: StockDataPoint[];
}

/**
 * デモ用のダミーデータを生成
 * @param symbol - 銘柄シンボル
 * @returns ダミーの株価データ
 */
const generateMockData = (symbol: string): StockDataPoint[] => {
    const data: StockDataPoint[] = [];
    const isBullish = symbol.includes('NVDA');
    const basePrice = symbol.includes('NVDA') ? 100 : symbol.includes('TSLA') ? 250 : 200;

    for (let i = 100; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        let dayPrice: number;
        if (isBullish) {
            dayPrice = basePrice * Math.pow(1.01, 100 - i);
            dayPrice += Math.random() * 0.5;
        } else {
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

/**
 * キャッシュからデータを取得
 * @param symbol - 銘柄シンボル
 * @returns キャッシュデータ（存在しない場合はnull）
 */
const getFromCache = (symbol: string): StockDataPoint[] | null => {
    if (typeof window === 'undefined') return null;

    const cacheKey = `${CACHE_KEY_PREFIX}${symbol}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    try {
        const parsed: CacheData = JSON.parse(cached);
        const { timestamp, data } = parsed;
        const now = Date.now();

        if (now - timestamp < CACHE_DURATION) {
            console.log(`Using cached data for ${symbol}`);
            return data.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        }
    } catch {
        console.warn('Cache parse error, fetching fresh data.');
        localStorage.removeItem(cacheKey);
    }

    return null;
};

/**
 * キャッシュにデータを保存
 * @param symbol - 銘柄シンボル
 * @param data - 株価データ
 */
const saveToCache = (symbol: string, data: StockDataPoint[]): void => {
    if (typeof window === 'undefined') return;

    const cacheKey = `${CACHE_KEY_PREFIX}${symbol}`;
    const cacheData: CacheData = {
        timestamp: Date.now(),
        data,
    };

    try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Failed to save to cache:', error);
    }
};

/**
 * 株価データを取得
 * @param symbol - 銘柄シンボル
 * @returns 株価データの配列
 * @throws APIエラー時
 */
export const fetchStockData = async (symbol: string, outputsize: 'compact' | 'full' = 'full'): Promise<StockDataPoint[]> => {
    // 1. キャッシュ確認
    const cachedData = getFromCache(symbol);
    if (cachedData) {
        return cachedData;
    }

    let result: StockDataPoint[] = [];

    // 2. APIからデータ取得
    try {
        const response = await axios.get<StockDataPoint[]>(`/api/stock?symbol=${symbol}`);

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            result = response.data;
        } else {
            throw new Error('Empty data returned from API');
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Fetch error for ${symbol}:`, errorMessage);

        // フォールバック: Mockデータ
        console.warn('Falling back to Mock Data due to API failure.');
        return generateMockData(symbol);
    }

    // 3. キャッシュ保存
    if (result.length > 0) {
        result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        saveToCache(symbol, result);
    }

    return result;
};

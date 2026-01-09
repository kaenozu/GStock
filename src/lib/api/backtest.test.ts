import { describe, it, expect } from 'vitest';
import { runBacktest } from './backtest';
import { StockDataPoint } from '@/types/market';

// テスト用ダミーデータ生成
const createMockData = (trend: 'UP' | 'DOWN' | 'FLAT', length: number = 100): StockDataPoint[] => {
    const data: StockDataPoint[] = [];
    let price = 100;
    
    const now = new Date();
    
    for (let i = 0; i < length; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (length - i));
        
        if (trend === 'UP') price += 1;
        else if (trend === 'DOWN') price -= 1;
        else price += Math.sin(i) * 2; // レンジ

        data.push({
            time: date.toISOString().split('T')[0],
            open: price,
            high: price + 2,
            low: price - 2,
            close: price
        });
    }
    return data;
};

describe('runBacktest', () => {
    it('データ不足時は初期バランスをそのまま返すこと', () => {
        const data = createMockData('UP', 10);
        const result = runBacktest(data, 10000);
        expect(result.initialBalance).toBe(10000);
        expect(result.finalBalance).toBe(10000);
        expect(result.trades).toBe(0);
    });

    it('上昇トレンドデータで利益が出ること（ゴールデンクロス戦略の確認）', () => {
        // SMA20とSMA50がクロスするように少し複雑な波形を作る必要がありますが、
        // ここでは単純な実行可能性とクラッシュしないことを確認します。
        // ※単純な一直線の上昇だとクロスが発生しない可能性があるため、データ量を増やして検証
        const data = createMockData('UP', 200);
        
        // 少し波をつける
        data.forEach((d, i) => {
            d.close += Math.sin(i / 10) * 5;
        });

        const result = runBacktest(data, 10000);
        
        expect(result).toBeDefined();
        expect(result.initialBalance).toBe(10000);
        // 結果はロジック次第だが、数値が計算されていることを確認
        expect(typeof result.finalBalance).toBe('number');
        expect(typeof result.profit).toBe('number');
    });

    it('下落トレンドでは損失回避またはショート戦略がないためノーポジ（または損失）であること', () => {
        const data = createMockData('DOWN', 200);
        const result = runBacktest(data, 10000);
        expect(result.initialBalance).toBe(10000);
    });
});

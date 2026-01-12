/**
 * Internal Paper Broker
 * @description 内部模擬取引ブローカーの実装
 * @module lib/trading/providers/InternalBroker
 */

import { Portfolio, Trade, TradeRequest, BrokerProvider, OrderType } from '../types';
import { PaperTradingEngine } from '../PaperTrader';

/**
 * 内部模擬取引ブローカー
 * @class InternalPaperBroker
 */
export class InternalPaperBroker implements BrokerProvider {
    /** ブローカー名 */
    readonly name = 'Internal PaperAccount';

    private engine: PaperTradingEngine;

    /**
     * @param engine - PaperTradingEngineインスタンス
     */
    constructor(engine: PaperTradingEngine) {
        this.engine = engine;
    }

    /**
     * ポートフォリオを取得（時価評価付き）
     * @returns ポートフォリオ状態
     */
    async getPortfolio(): Promise<Portfolio> {
        const portfolio = this.engine.getPortfolio();

        // ポジションがあれば時価評価を取得
        if (portfolio.positions.length > 0) {
            const prices = await this.fetchCurrentPrices(portfolio.positions.map(p => p.symbol));
            return this.engine.updateEquityWithPrices(prices);
        }

        return portfolio;
    }

    /**
     * 複数銘柄の現在価格を取得
     * @private
     */
    private async fetchCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
        const prices: Record<string, number> = {};

        // 並列で価格取得
        await Promise.all(symbols.map(async (symbol) => {
            try {
                const res = await fetch(`http://localhost:${process.env.PORT || 8000}/api/quotes?symbol=${symbol}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.price) {
                        prices[symbol] = data.price;
                    }
                }
            } catch {
                // エラー時はスキップ（取得価格を使用）
            }
        }));

        return prices;
    }

    /**
     * 取引を実行
     * @param symbol - 銘柄シンボル
     * @param side - 売買方向
     * @param quantity - 数量
     * @param price - 価格
     * @param reason - 取引理由
     * @returns 取引結果
     * @throws 取引失敗時
     */
    async executeTrade(
        symbol: string,
        side: 'BUY' | 'SELL',
        quantity: number,
        price: number,
        orderType: OrderType,
        reason: string
    ): Promise<Trade> {
        const req: TradeRequest = { symbol, side, quantity, price, orderType, reason };
        const result = await this.engine.executeTrade(req);

        if (!result.success || !result.trade) {
            throw new Error(result.message);
        }

        return result.trade;
    }
}

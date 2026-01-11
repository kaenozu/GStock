/**
 * Internal Paper Broker
 * @description 内部模擬取引ブローカーの実装
 * @module lib/trading/providers/InternalBroker
 */

import { Portfolio, Trade, TradeRequest, BrokerProvider } from '../types';
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
     * ポートフォリオを取得
     * @returns ポートフォリオ状態
     */
    async getPortfolio(): Promise<Portfolio> {
        return this.engine.getPortfolio();
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
        reason: string
    ): Promise<Trade> {
        const req: TradeRequest = { symbol, side, quantity, price, reason };
        const result = await this.engine.executeTrade(req);
        
        if (!result.success || !result.trade) {
            throw new Error(result.message);
        }
        
        return result.trade;
    }
}

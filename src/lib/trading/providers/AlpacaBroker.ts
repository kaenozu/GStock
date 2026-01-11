/**
 * Alpaca Broker
 * @description Alpaca APIを使用した取引ブローカー
 * @module lib/trading/providers/AlpacaBroker
 */

import { Portfolio, Trade, Position, BrokerProvider } from '../types';

/** Alpaca APIレスポンスのポジション型 */
interface AlpacaPosition {
    symbol: string;
    qty: string;
    avg_entry_price: string;
}

/** Alpaca APIレスポンスのアカウント型 */
interface AlpacaAccount {
    cash: string;
    equity: string;
}

/** Alpaca APIレスポンスのオーダー型 */
interface AlpacaOrder {
    id: string;
    created_at: string;
    symbol: string;
}

/** 初期投資額 */
const INITIAL_INVESTMENT = 1000000;

/**
 * Alpacaブローカー
 * @class AlpacaBroker
 */
export class AlpacaBroker implements BrokerProvider {
    /** ブローカー名 */
    readonly name = 'Alpaca (Paper)';
    
    private readonly apiKey: string;
    private readonly secretKey: string;
    private readonly baseUrl: string = 'https://paper-api.alpaca.markets';

    constructor() {
        this.apiKey = process.env.ALPACA_API_KEY || '';
        this.secretKey = process.env.ALPACA_SECRET_KEY || '';
    }

    /**
     * APIリクエスト用ヘッダーを取得
     * @private
     */
    private getHeaders(): Record<string, string> {
        return {
            'APCA-API-KEY-ID': this.apiKey,
            'APCA-API-SECRET-KEY': this.secretKey,
            'Content-Type': 'application/json'
        };
    }

    /**
     * ポートフォリオを取得
     * @returns ポートフォリオ状態
     * @throws APIキー未設定時またはAPIエラー時
     */
    async getPortfolio(): Promise<Portfolio> {
        if (!this.apiKey) {
            throw new Error("Alpaca API Key not configured. Check .env.local");
        }

        const [accRes, posRes] = await Promise.all([
            fetch(`${this.baseUrl}/v2/account`, { headers: this.getHeaders() }),
            fetch(`${this.baseUrl}/v2/positions`, { headers: this.getHeaders() })
        ]);

        if (!accRes.ok) throw new Error(`Alpaca Account Error: ${accRes.status}`);
        if (!posRes.ok) throw new Error(`Alpaca Positions Error: ${posRes.status}`);

        const account: AlpacaAccount = await accRes.json();
        const alpacaPositions: AlpacaPosition[] = await posRes.json();

        const positions: Position[] = alpacaPositions.map((p) => ({
            symbol: p.symbol,
            quantity: Number(p.qty),
            averagePrice: Number(p.avg_entry_price)
        }));

        const now = new Date().toISOString();
        const equity = Number(account.equity);

        return {
            cash: Number(account.cash),
            equity,
            dailyStartEquity: equity, // Alpacaは別途管理が必要
            dayStartDate: now.split('T')[0],
            positions,
            trades: [], // Alpacaは取引履歴を別APIで取得する必要がある
            lastUpdated: now
        };
    }

    /**
     * 取引を実行
     * @param symbol - 銘柄シンボル
     * @param side - 売買方向
     * @param quantity - 数量
     * @param price - 価格（マーケット注文の場合は推定値）
     * @param reason - 取引理由
     * @returns 取引結果
     * @throws APIエラー時
     */
    async executeTrade(
        symbol: string, 
        side: 'BUY' | 'SELL', 
        quantity: number, 
        price: number, 
        reason: string
    ): Promise<Trade> {
        const url = `${this.baseUrl}/v2/orders`;
        const body = {
            symbol: symbol,
            qty: String(quantity),
            side: side.toLowerCase(),
            type: 'market',
            time_in_force: 'gtc'
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Alpaca Order Error: ${err.message || res.status}`);
        }

        const order: AlpacaOrder = await res.json();

        return {
            id: order.id,
            timestamp: order.created_at,
            symbol: symbol,
            side: side,
            quantity: quantity,
            price: price, // マーケット注文の実際の約定価格は後で確定
            total: price * quantity,
            commission: 0, // Alpacaは手数料無料
            reason: reason
        };
    }
}

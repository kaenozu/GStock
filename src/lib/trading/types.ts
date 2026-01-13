/**
 * Trading Types - 取引システムの型定義
 * @module lib/trading/types
 */

/** 注文タイプ */
export type OrderType = 'MARKET' | 'LIMIT';

/** ポジション（保有銘柄） */
export interface Position {
    /** 銘柄シンボル */
    symbol: string;
    /** 保有数量 */
    quantity: number;
    /** 平均取得価格（手数料込み） */
    averagePrice: number;
    /** 現在価格（時価評価用、オプショナル） */
    currentPrice?: number;
    /** 評価損益（計算済み、オプショナル） */
    unrealizedPnL?: number;
    /** 評価損益率（%、オプショナル） */
    unrealizedPnLPercent?: number;
}

/** 取引記録 */
export interface Trade {
    /** 一意のID（crypto.randomUUIDで生成） */
    id: string;
    /** 取引時刻（ISO 8601形式） */
    timestamp: string;
    /** 銘柄シンボル */
    symbol: string;
    /** 売買方向 */
    side: 'BUY' | 'SELL';
    /** 数量 */
    quantity: number;
    /** 約定価格（スリッページ適用後） */
    price: number;
    /** 取引金額（手数料除く） */
    total: number;
    /** 手数料 */
    commission: number;
    /** 注文タイプ */
    orderType: OrderType;
    /** 取引理由 */
    reason?: string;
}

/** ポートフォリオ状態 */
export interface Portfolio {
    /** 現金残高 */
    cash: number;
    /** 総評価額（現金 + ポジション時価） */
    equity: number;
    /** 日次開始時点の評価額（デイリーロス計算用） */
    dailyStartEquity: number;
    /** 日次開始日（YYYY-MM-DD） */
    dayStartDate: string;
    /** 保有ポジション一覧 */
    positions: Position[];
    /** 取引履歴（最新50件） */
    trades: Trade[];
    /** 最終更新日時 */
    lastUpdated: string;

    // 後方互換性のためのエイリアス（旧: initialHash）
    /** @deprecated dailyStartEquityを使用してください */
    initialHash?: number;
}

/** 取引リクエスト */
export interface TradeRequest {
    /** 銘柄シンボル */
    symbol: string;
    /** 売買方向 */
    side: 'BUY' | 'SELL';
    /** 数量（省略時は1） */
    quantity?: number;
    /** 注文価格（指値の場合は必須） */
    price: number;
    /** 注文タイプ（省略時はMARKET） */
    orderType?: OrderType;
    /** 取引理由 */
    reason?: string;
}

/** 取引設定 */
export interface TradingConfig {
    /** 初期資金 */
    initialCash: number;
    /** 手数料率（片道、0.001 = 0.1%） */
    commissionRate: number;
    /** スリッページ率（0.0005 = 0.05%） */
    slippageRate: number;
}

/** ブローカーインターフェース */
export interface BrokerProvider {
    /** ポートフォリオ取得 */
    getPortfolio(): Promise<Portfolio>;
    /** 取引実行 */
    executeTrade(
        symbol: string,
        side: 'BUY' | 'SELL',
        quantity: number,
        price: number,
        orderType: OrderType,
        reason?: string
    ): Promise<Trade>;
}

/**
 * WebSocket Message Schemas
 * @description Finnhub WebSocketメッセージのzodスキーマ定義
 * @module lib/websocket/schemas
 */

import { z } from 'zod';

/**
 * Finnhub Tradeデータのスキーマ
 * @see https://finnhub.io/docs/api/websocket-trades
 */
export const FinnhubTradeSchema = z.object({
    /** シンボル */
    s: z.string(),
    /** 価格 */
    p: z.number(),
    /** 出来高 */
    v: z.number(),
    /** タイムスタンプ（ミリ秒） */
    t: z.number(),
    /** 取引条件 */
    c: z.array(z.string()).optional(),
});

/**
 * Finnhub WebSocketメッセージのスキーマ
 */
export const FinnhubMessageSchema = z.object({
    /** メッセージタイプ */
    type: z.enum(['trade', 'ping', 'error']),
    /** トレードデータ（type='trade'の場合） */
    data: z.array(FinnhubTradeSchema).optional(),
    /** エラーメッセージ（type='error'の場合） */
    msg: z.string().optional(),
});

/** Finnhub Tradeデータの型 */
export type FinnhubTrade = z.infer<typeof FinnhubTradeSchema>;

/** Finnhub WebSocketメッセージの型 */
export type FinnhubMessage = z.infer<typeof FinnhubMessageSchema>;

/**
 * 内部用の正規化された価格データ
 */
export interface NormalizedPrice {
    /** シンボル */
    symbol: string;
    /** 価格 */
    price: number;
    /** 出来高 */
    volume: number;
    /** タイムスタンプ */
    timestamp: number;
}

/**
 * WebSocket接続状態
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * WebSocketイベント
 */
export interface WebSocketEvent {
    type: 'price' | 'status' | 'error';
    data: NormalizedPrice | ConnectionStatus | string;
}

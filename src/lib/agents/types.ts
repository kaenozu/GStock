/**
 * Agent Types - AIエージェントの型定義
 * @module lib/agents/types
 */

import { StockDataPoint, MarketRegime } from '@/types/market';

/** エージェントの役割 */
export type AgentRole = 'CHAIRMAN' | 'TREND' | 'REVERSAL' | 'VOLATILE' | 'FUNDAMENTAL' | 'MACRO' | 'NEWS' | 'OPTION' | 'MULTI_TIMEFRAME';

/** エージェントの分析結果 */
export interface AgentResult {
    /** エージェント名 */
    name: string;
    /** 役割 */
    role: AgentRole;
    /** シグナル */
    signal: 'BUY' | 'SELL' | 'HOLD';
    /** 信頼度（0-100） */
    confidence: number;
    /** 判断理由 */
    reason: string;
    /** センチメント */
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * エージェントインターフェース
 * @interface Agent
 */
export interface Agent {
    /** エージェントID */
    id: string;
    /** エージェント名 */
    name: string;
    /** 役割 */
    role: AgentRole;
    /**
     * 分析を実行
     * @param data - 株価データ
     * @param regime - 市場環境（オプション）
     * @returns 分析結果
     */
    analyze(data: StockDataPoint[], regime?: MarketRegime): AgentResult;
}

/** エージェントの重み付け */
export type AgentWeights = Record<AgentRole, number>;

/** デフォルトの重み付け */
export const DEFAULT_AGENT_WEIGHTS: AgentWeights = {
    CHAIRMAN: 2.0,
    VOLATILE: 1.5,
    TREND: 1.0,
    REVERSAL: 1.0,
    FUNDAMENTAL: 1.0,
    MACRO: 0.8,
    NEWS: 0.5,
    OPTION: 0.7,
    MULTI_TIMEFRAME: 1.2,
};

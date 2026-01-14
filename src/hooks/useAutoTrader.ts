/**
 * useAutoTrader Hook
 * @description 自動取引の執行ロジックを管理するフック
 * @module hooks/useAutoTrader
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { AnalysisResult } from '@/types/market';
import { KnowledgeAgent, RiskParameters } from '@/lib/agents/KnowledgeAgent';
import { CONFIDENCE_THRESHOLD } from '@/config/constants';

export const useAutoTrader = (
    isAutoTrading: boolean,
    handleAutoTrade?: (request: any) => Promise<any>
) => {
    /**
     * 取引を実行する
     * @param result 分析結果
     */
    const executeTrade = useCallback(async (result: AnalysisResult) => {
        if (!isAutoTrading || !handleAutoTrade) return;

        // 中立、または信頼度が閾値以下の場合はスキップ
        if (result.sentiment === 'NEUTRAL' || result.confidence < CONFIDENCE_THRESHOLD) {
            return;
        }

        try {
            const lastPrice = result.stats.price;

            // Calculate position size and limit price
            const riskParams: RiskParameters = {
                accountEquity: 1000000, // Mock equity for now, ideally fetched from usePortfolio
                riskPerTradePercent: 0.02, // 2% risk
                maxPositionSizePercent: 0.2 // Max 20% allocation
            };

            const setup = {
                symbol: result.symbol,
                price: lastPrice,
                confidence: result.confidence,
                sentiment: result.sentiment
            };

            const quantity = KnowledgeAgent.calculatePositionSize(setup, riskParams);
            const limitPrice = KnowledgeAgent.calculateLimitPrice(setup);

            // Execute Trade
            await handleAutoTrade({
                symbol: result.symbol,
                side: result.sentiment === 'BULLISH' ? 'BUY' : 'SELL',
                type: 'LIMIT',
                quantity,
                price: limitPrice,
                reason: `Auto-Bot: ${result.sentiment} (Conf: ${result.confidence}%)`
            });

            toast.success(`🤖 Auto-Trade Executed: ${result.symbol}`, {
                description: `${result.sentiment} ${quantity} shares @ $${limitPrice}`
            });
            console.log(`[Auto-Bot] Executed: ${result.symbol}, Qty: ${quantity}, Price: ${limitPrice}`);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('[Auto-Bot] Execution Failed:', error);
            toast.error(`🤖 Auto-Trade Failed: ${result.symbol}`, {
                description: errorMsg
            });
        }
    }, [isAutoTrading, handleAutoTrade]);

    return { executeTrade };
};

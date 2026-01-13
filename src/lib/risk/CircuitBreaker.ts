/**
 * CircuitBreaker - Iron Dome Risk Management System
 * @description トレードのリスクを管理し、過度な損失を防止する
 * @module lib/risk/CircuitBreaker
 */

import { Portfolio, TradeRequest } from '@/lib/trading/types';

/** リスク設定 */
interface RiskConfig {
    /** 日次最大損失率（0.05 = 5%） */
    maxDailyLossPercent: number;
    /** 単一銘柄の最大エクスポージャー（0.20 = 20%） */
    maxPositionSizePercent: number;
    /** 同一銘柄のクールダウン時間（ミリ秒） */
    cooldownMs: number;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: RiskConfig = {
    maxDailyLossPercent: 0.05, // 5%
    maxPositionSizePercent: 0.20, // 20%
    cooldownMs: 60 * 1000, // 60秒
};

/** チェック結果 */
export interface RiskCheckResult {
    /** 取引が許可されたか */
    allowed: boolean;
    /** 拒否理由（allowed=falseの場合） */
    reason?: string;
    /** 発動したルール */
    triggeredRule?: 'DAILY_LOSS' | 'COOLDOWN' | 'MAX_EXPOSURE';
}

/**
 * サーキットブレーカー
 * @class CircuitBreaker
 */
export class CircuitBreaker {
    private static config: RiskConfig = DEFAULT_CONFIG;

    /**
     * 設定を更新
     * @param newConfig - 新しい設定（部分的に上書き可能）
     */
    public static configure(newConfig: Partial<RiskConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 取引リクエストをチェック
     * @param portfolio - 現在のポートフォリオ
     * @param request - 取引リクエスト
     * @returns チェック結果
     */
    public static checkTrade(portfolio: Portfolio, request: TradeRequest): RiskCheckResult {
        // 1. 日次損失リミットチェック
        const dailyLossCheck = this.checkDailyLoss(portfolio);
        if (!dailyLossCheck.allowed) {
            return dailyLossCheck;
        }

        // 2. クールダウンチェック（スパム防止）
        const cooldownCheck = this.checkCooldown(portfolio, request.symbol);
        if (!cooldownCheck.allowed) {
            return cooldownCheck;
        }

        // 3. 最大エクスポージャーチェック（買いのみ）
        if (request.side === 'BUY') {
            const exposureCheck = this.checkExposure(portfolio, request);
            if (!exposureCheck.allowed) {
                return exposureCheck;
            }
        }

        return { allowed: true };
    }

    /**
     * 日次損失リミットチェック
     * @private
     */
    private static checkDailyLoss(portfolio: Portfolio): RiskCheckResult {
        // dailyStartEquityが設定されていない場合は後方互換性のためinitialHashもチェック
        const startEquity = portfolio.dailyStartEquity || portfolio.initialHash || portfolio.equity;
        
        if (startEquity <= 0) {
            return { allowed: true }; // 計算不能な場合はパス
        }

        const currentLoss = startEquity - portfolio.equity;
        const lossPercent = currentLoss / startEquity;

        if (lossPercent > this.config.maxDailyLossPercent) {
            return {
                allowed: false,
                reason: `Circuit Breaker: Daily Loss Exceeded (${(lossPercent * 100).toFixed(1)}% > ${(this.config.maxDailyLossPercent * 100)}%)`,
                triggeredRule: 'DAILY_LOSS',
            };
        }

        return { allowed: true };
    }

    /**
     * クールダウンチェック
     * @private
     */
    private static checkCooldown(portfolio: Portfolio, symbol: string): RiskCheckResult {
        const lastTrade = portfolio.trades.find(t => t.symbol === symbol);
        if (!lastTrade) {
            return { allowed: true };
        }

        const timeDiff = Date.now() - new Date(lastTrade.timestamp).getTime();
        const remainingSeconds = Math.ceil((this.config.cooldownMs - timeDiff) / 1000);

        if (timeDiff < this.config.cooldownMs) {
            return {
                allowed: false,
                reason: `Circuit Breaker: Cooldown Active (${remainingSeconds}s remaining)`,
                triggeredRule: 'COOLDOWN',
            };
        }

        return { allowed: true };
    }

    /**
     * 最大エクスポージャーチェック
     * @private
     */
    private static checkExposure(portfolio: Portfolio, request: TradeRequest): RiskCheckResult {
        const tradeCost = request.price * (request.quantity || 1);
        
        // 既存ポジションの価値
        const existingPos = portfolio.positions.find(p => p.symbol === request.symbol);
        const existingValue = existingPos ? existingPos.quantity * existingPos.averagePrice : 0;
        
        // 取引後の総エクスポージャー
        const totalExposureAfterTrade = existingValue + tradeCost;
        
        // ポートフォリオ評価額に対する割合
        const exposurePercent = totalExposureAfterTrade / portfolio.equity;

        if (exposurePercent > this.config.maxPositionSizePercent) {
            return {
                allowed: false,
                reason: `Circuit Breaker: Max Position Size Exceeded (${(exposurePercent * 100).toFixed(1)}% > ${(this.config.maxPositionSizePercent * 100)}%)`,
                triggeredRule: 'MAX_EXPOSURE',
            };
        }

        return { allowed: true };
    }

    /**
     * 現在の設定を取得
     */
    public static getConfig(): Readonly<RiskConfig> {
        return { ...this.config };
    }
}

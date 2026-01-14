/**
 * PaperTradingEngine - 模擬取引エンジン
 * @description 仮想ポートフォリオの取引を管理する
 * @module lib/trading/PaperTrader
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Portfolio, Trade, TradeRequest, TradingConfig } from './types';
import { CircuitBreaker } from '@/lib/risk/CircuitBreaker';

/** データディレクトリのパス（環境変数で上書き可能） */
const DATA_DIR = process.env.GSTOCK_DATA_DIR || path.join(process.cwd(), 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'paper_portfolio.json');

/** デフォルト設定 */
const DEFAULT_CONFIG: TradingConfig = {
    initialCash: 1000000, // 1M JPY
    commissionRate: 0.001, // 0.1% 片道手数料
    slippageRate: 0.0005, // 0.05% スリッページ
};

/**
 * 模擬取引エンジン
 * @class PaperTradingEngine
 */
export class PaperTradingEngine {
    private portfolio: Portfolio;
    private config: TradingConfig;
    private savePromise: Promise<void> | null = null;

    /**
     * @param config - 取引設定（オプション）
     */
    constructor(config?: Partial<TradingConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.portfolio = this.loadStateSync();
    }

    /**
     * ポートフォリオ状態を同期的に読み込み（初期化用）
     * @private
     */
    private loadStateSync(): Portfolio {
        try {
            if (!fsSync.existsSync(DATA_DIR)) {
                fsSync.mkdirSync(DATA_DIR, { recursive: true });
            }

            if (fsSync.existsSync(PORTFOLIO_FILE)) {
                const data = fsSync.readFileSync(PORTFOLIO_FILE, 'utf-8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error("Failed to load portfolio:", error);
        }

        return this.createInitialPortfolio();
    }

    /**
     * 初期ポートフォリオを作成
     * @private
     */
    private createInitialPortfolio(): Portfolio {
        const now = new Date().toISOString();
        return {
            cash: this.config.initialCash,
            equity: this.config.initialCash,
            dailyStartEquity: this.config.initialCash, // 日次開始時点の評価額
            positions: [],
            trades: [],
            lastUpdated: now,
            dayStartDate: now.split('T')[0], // 日付のみ保存
        };
    }

    /**
     * ポートフォリオ状態を非同期で保存
     * @private
     */
    private async saveStateAsync(): Promise<void> {
        // 既に保存中の場合は待機
        if (this.savePromise) {
            await this.savePromise;
        }

        this.savePromise = (async () => {
            try {
                if (!fsSync.existsSync(DATA_DIR)) {
                    await fs.mkdir(DATA_DIR, { recursive: true });
                }
                await fs.writeFile(PORTFOLIO_FILE, JSON.stringify(this.portfolio, null, 2));
            } catch (error) {
                console.error("Failed to save portfolio:", error);
                throw error; // エラーを上位に伝播
            } finally {
                this.savePromise = null;
            }
        })();

        return this.savePromise;
    }

    /**
     * 日次リセットのチェックと実行
     * @private
     */
    private checkDailyReset(): void {
        const today = new Date().toISOString().split('T')[0];
        if (this.portfolio.dayStartDate !== today) {
            this.portfolio.dayStartDate = today;
            this.portfolio.dailyStartEquity = this.portfolio.equity;
        }
    }

    /**
     * 現在のポートフォリオを取得
     * @returns Portfolio - ポートフォリオ状態
     */
    public getPortfolio(): Portfolio {
        this.checkDailyReset();
        return { ...this.portfolio };
    }

    /**
     * 取引手数料を計算
     * @param amount - 取引金額
     * @returns 手数料
     */
    private calculateCommission(amount: number): number {
        return amount * this.config.commissionRate;
    }

    /**
     * スリッページを適用した価格を計算
     * @param price - 基準価格
     * @param side - 売買方向
     * @returns スリッページ適用後の価格
     */
    private applySlippage(price: number, side: 'BUY' | 'SELL'): number {
        const slippage = price * this.config.slippageRate;
        return side === 'BUY' ? price + slippage : price - slippage;
    }

    /**
     * 暗号学的に安全なIDを生成
     * @private
     */
    private generateSecureId(): string {
        return crypto.randomUUID();
    }

    /**
     * 取引を実行
     * @param request - 取引リクエスト
     * @returns 取引結果
     */
    public async executeTrade(request: TradeRequest, currentMarketPrice?: number): Promise<{ success: boolean; message: string; trade?: Trade }> {
        this.checkDailyReset();

        // Circuit Breaker Check
        const safetyCheck = CircuitBreaker.checkTrade(this.portfolio, request);
        if (!safetyCheck.allowed) {
            console.warn(`[Iron Dome] Trade Rejected: ${safetyCheck.reason}`);
            return { success: false, message: safetyCheck.reason || "Risk Check Failed" };
        }

        const { symbol, side, reason, orderType } = request;
        const quantity = request.quantity || 1;

        // Validation with currentMarketPrice if provided
        if (currentMarketPrice && orderType === 'LIMIT') {
            if (side === 'BUY' && currentMarketPrice > request.price) {
                return { success: false, message: `Limit Buy Not Filled: Market(${currentMarketPrice}) > Limit(${request.price})` };
            }
            if (side === 'SELL' && currentMarketPrice < request.price) {
                // For Short Sell Limit, we want to sell at Price or higher.
                // If Market < Limit, we don't fill.
                return { success: false, message: `Limit Sell Not Filled: Market(${currentMarketPrice}) < Limit(${request.price})` };
            }
        }

        const executionPrice = this.applySlippage(request.price, side);
        const grossAmount = executionPrice * quantity;
        const commission = this.calculateCommission(grossAmount);

        // Find existing position
        let existingPos = this.portfolio.positions.find(p => p.symbol === symbol);

        if (side === 'BUY') {
            const totalCost = grossAmount + commission; // For buying long

            // Scenario 1: Covering Short Position (Buy to Cover)
            if (existingPos && existingPos.quantity < 0) {
                // Determine how much we are covering
                const coverQty = Math.min(Math.abs(existingPos.quantity), quantity);
                const remainingQty = quantity - coverQty;

                // Calculate Cost to Cover
                const coverCost = (executionPrice * coverQty) + this.calculateCommission(executionPrice * coverQty);

                if (this.portfolio.cash < coverCost) {
                    return { success: false, message: `Insufficient Funds to Cover (Req: ¥${coverCost.toLocaleString()})` };
                }

                this.portfolio.cash -= coverCost;

                // Update Position
                existingPos.quantity += coverQty; // -10 + 5 = -5

                // If flipping to Long (remainingQty > 0)
                if (remainingQty > 0) {
                    const longCost = (executionPrice * remainingQty) + this.calculateCommission(executionPrice * remainingQty);
                    if (this.portfolio.cash < longCost) {
                        // Covered partial but cannot flip? This is edge case.
                        // Let's just stop at neutral or error.
                        // For simplicity, failing the flip if insufficient funds.
                        return { success: false, message: `Insufficient Funds to Flip Long` };
                    }
                    this.portfolio.cash -= longCost;
                    existingPos.quantity += remainingQty;
                    // Reset average price for the new long portion?
                    // When crossing zero, avg price resets to new entry.
                    // Since specific lots are not tracked, we assume new avg price for positive part.
                    existingPos.averagePrice = executionPrice;
                }

                if (existingPos.quantity === 0) {
                    this.portfolio.positions = this.portfolio.positions.filter(p => p.symbol !== symbol);
                }

            } else {
                // Scenario 2: Opening/Adding Long Position
                if (this.portfolio.cash < totalCost) {
                    return { success: false, message: `Insufficient Funds (Required: ¥${totalCost.toLocaleString()}, Available: ¥${this.portfolio.cash.toLocaleString()})` };
                }

                this.portfolio.cash -= totalCost;

                if (existingPos) {
                    // Averaging Up/Down
                    const existingCost = existingPos.quantity * existingPos.averagePrice;
                    const newCost = totalCost; // includes commission in logic? 
                    // Usually AvgPrice is raw price. Commission is expensed immediately from cash.
                    // Our Portfolio logic: averagePrice seems to be used for Cost Basis.
                    // Previous code: `averagePrice: totalCost / quantity` (Commission included in Avg Price).
                    // This is conservative (higher basis). Okay.
                    existingPos.quantity += quantity;
                    existingPos.averagePrice = (existingCost + newCost) / existingPos.quantity;
                } else {
                    this.portfolio.positions.push({
                        symbol,
                        quantity,
                        averagePrice: totalCost / quantity,
                    });
                }
            }

        } else if (side === 'SELL') {
            // Scenario 3: Closing Long Position / Selling Short
            // Proceeds
            const netProceeds = grossAmount - commission;

            if (existingPos && existingPos.quantity > 0) {
                // Closing Long
                const closeQty = Math.min(existingPos.quantity, quantity);
                const remainingQty = quantity - closeQty; // To Short

                this.portfolio.cash += (executionPrice * closeQty) - this.calculateCommission(executionPrice * closeQty);
                existingPos.quantity -= closeQty;

                if (remainingQty > 0) {
                    // Flip to Short
                    // Need Margin/Cash check?
                    // Assuming Cash is Collateral.
                    // Short Proceeds are added to Cash, but we need consistent accounting.
                    // Simple Short: Cash increases, but Liability exists.
                    // Standard: Cash += Proceeds.
                    const shortProceeds = (executionPrice * remainingQty) - this.calculateCommission(executionPrice * remainingQty);
                    this.portfolio.cash += shortProceeds;

                    existingPos.quantity -= remainingQty; // Becomes negative
                    // Reset Avg Price for Short
                    existingPos.averagePrice = executionPrice; // Commission should be "deducted" from proceeds, so effective price is lower?
                    // Or Cost Basis for Short?
                    // For Short, Higher Entry is better.
                    // If we include commission in AvgPrice, we should Reduce AvgPrice?
                    // (Entry Price - Comm/Qty).
                    // Previous logic: AvgPrice = Cost / Qty.
                    // Let's stick to: AvgPrice = (GrossProceeds - Comm) / Qty ? No.
                    // Let's just use Execution Price for AvgPrice on Short, commission is sunk cost.
                    existingPos.averagePrice = executionPrice;
                }

                if (existingPos.quantity === 0) {
                    this.portfolio.positions = this.portfolio.positions.filter(p => p.symbol !== symbol);
                }

            } else {
                // Scenario 4: Opening/Adding Short Position
                if (existingPos) {
                    // Adding to Short (quantity is negative)
                    // existingPos.quantity is -10. Request 5. New is -15.
                    // Weighted Average Price.
                    // Current Basis: abs(-10) * 100 = 1000.
                    // New Trade: 5 * 105 = 525.
                    // New Basis: 1525 / 15 = 101.66.

                    const currentBasis = Math.abs(existingPos.quantity) * existingPos.averagePrice;
                    const newTradeValue = quantity * executionPrice;

                    this.portfolio.cash += netProceeds;
                    existingPos.quantity -= quantity;
                    existingPos.averagePrice = (currentBasis + newTradeValue) / Math.abs(existingPos.quantity);

                } else {
                    // New Short
                    this.portfolio.cash += netProceeds;
                    this.portfolio.positions.push({
                        symbol,
                        quantity: -quantity,
                        averagePrice: executionPrice
                    });
                }
            }
        }

        // Update Equity
        this.updateEquity();

        // Record Trade
        const trade: Trade = {
            id: this.generateSecureId(),
            timestamp: new Date().toISOString(),
            symbol,
            side,
            quantity,
            price: executionPrice,
            total: grossAmount,
            commission,
            orderType: orderType || 'MARKET',
            reason: reason || 'Manual Trade',
        };

        this.portfolio.trades.unshift(trade);
        if (this.portfolio.trades.length > 50) {
            this.portfolio.trades.pop();
        }

        this.portfolio.lastUpdated = new Date().toISOString();

        this.saveStateAsync().catch(err => {
            console.error('[PaperTrader] Failed to persist trade:', err);
        });

        return { success: true, message: "Order Executed", trade };
    }

    /**
     * 評価額を更新（ポジションの時価評価は呼び出し側で行う想定）
     * @private
     */
    private updateEquity(): void {
        // 簡易計算：現金 + ポジションの取得原価ベース
        // 実際の時価評価は呼び出し側で価格情報を渡して行う
        const positionValue = this.portfolio.positions.reduce(
            (sum, p) => sum + (p.quantity * p.averagePrice),
            0
        );
        this.portfolio.equity = this.portfolio.cash + positionValue;
    }

    /**
     * 時価でポートフォリオ評価額を更新
     * @param prices - 銘柄ごとの現在価格
     * @returns 更新後のポートフォリオ
     */
    public updateEquityWithPrices(prices: Record<string, number>): Portfolio {
        let totalPositionValue = 0;

        // 各ポジションの時価評価を計算
        for (const position of this.portfolio.positions) {
            const currentPrice = prices[position.symbol] || position.averagePrice;
            const marketValue = position.quantity * currentPrice;
            const costBasis = position.quantity * position.averagePrice;
            const unrealizedPnL = marketValue - costBasis;
            const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

            // ポジションに時価情報を追加
            position.currentPrice = currentPrice;
            position.unrealizedPnL = Math.round(unrealizedPnL * 100) / 100;
            position.unrealizedPnLPercent = Math.round(unrealizedPnLPercent * 100) / 100;

            totalPositionValue += marketValue;
        }

        this.portfolio.equity = this.portfolio.cash + totalPositionValue;
        this.portfolio.lastUpdated = new Date().toISOString();

        return this.getPortfolio();
    }

    /**
     * アカウントをリセット
     */
    public async resetAccount(): Promise<void> {
        try {
            if (fsSync.existsSync(PORTFOLIO_FILE)) {
                await fs.unlink(PORTFOLIO_FILE);
            }
        } catch (error) {
            console.error('Failed to delete portfolio file:', error);
        }
        this.portfolio = this.createInitialPortfolio();
    }

    /**
     * 取引設定を取得
     */
    public getConfig(): TradingConfig {
        return { ...this.config };
    }
}

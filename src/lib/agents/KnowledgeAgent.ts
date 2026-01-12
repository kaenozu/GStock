/**
 * KnowledgeAgent
 * @description 資金管理と執行戦略を担当するエージェント
 * リスク計算、ポジションサイジング、指値決定を行う
 */

export interface RiskParameters {
    accountEquity: number;
    riskPerTradePercent: number; // e.g., 2% (0.02)
    maxPositionSizePercent: number; // e.g., 20% (0.2)
}

export interface TradeSetup {
    symbol: string;
    price: number;
    atr?: number; // Average True Range for volatility based stops (optional)
    confidence: number; // 0-100
    sentiment: 'BULLISH' | 'BEARISH';
}

export class KnowledgeAgent {
    /**
     * ポジションサイズ（株数）を計算する
     * @param setup 取引セットアップ詳細
     * @param params リスクパラメータ
     * @returns 推奨数量 (株数)
     */
    static calculatePositionSize(setup: TradeSetup, params: RiskParameters): number {
        // 基本的な資金管理: 口座資産の特定%を1取引のリスクとする
        // ここでは簡易的に「1取引あたりの投入金額」を計算 (本来はストップロス幅に基づくが、簡易版として投入額上限で計算)

        // 信頼度によるスケーリング (50%〜100% -> 0.5〜1.0倍)
        // 信頼度が低い場合はポジションを小さくする
        const confidenceFactor = Math.max(0.5, setup.confidence / 100);

        // 基本投入推奨額 = 資産 * リスク% * 5 (レバレッジ的発想ではなく、リスク=損失額と仮定した場合の逆算)
        // ※ ここでは単純化のため、「1取引あたり最大20%まで」または「資産の2%」ルールを適用

        // Strategy 1: Fixed Fractional Position Sizing (Fixed % of Equity)
        // 最大ポジションサイズ = 資産 * MaxPositionSizePercent (例: 100万円 * 20% = 20万円)
        const maxAllocation = params.accountEquity * params.maxPositionSizePercent;

        // 信頼度で調整
        const targetAllocation = maxAllocation * confidenceFactor;

        // 株数計算 (小数点以下切り捨て)
        let quantity = Math.floor(targetAllocation / setup.price);

        // 最低1株
        if (quantity < 1) quantity = 1;

        // 安全策: 異常な数量にならないようキャップ
        // 例: 価格が極端に低い場合など
        if (quantity > 10000) quantity = 10000;

        return quantity;
    }

    /**
     * 指値価格を決定する
     * @param setup 取引セットアップ詳細
     * @returns 推奨エントリー価格
     */
    static calculateLimitPrice(setup: TradeSetup): number {
        const { price, sentiment, confidence } = setup;

        // 信頼度が非常に高い(>80)場合は、より成行に近い価格で確実に約定させる
        // 信頼度が低い場合は、より有利な価格を待つ

        let aggressiveFactor = 0;
        if (confidence > 80) aggressiveFactor = 0.2; // 積極的
        else if (confidence < 60) aggressiveFactor = -0.2; // 保守的

        // 基本戦略: 現在価格より少し有利な価格で指す
        // BUY: 現在価格より少し下
        // SELL: 現在価格より少し上

        // スリッページ/指値幅係数 (0.1% 〜 0.5%)
        const spreadPercent = 0.001; // 0.1%

        if (sentiment === 'BULLISH') {
            // 買い: 安く買いたいが、強気なら現在価格に近づける
            // (1 - (0.001 * (1 - aggressive)))
            // aggressive=0.2 -> 1 - 0.0008 (現在価格の99.92%)
            // aggressive=-0.2 -> 1 - 0.0012 (現在価格の99.88%)
            const markdown = spreadPercent * (1 - aggressiveFactor);
            const limitPrice = price * (1 - markdown);
            return Number(limitPrice.toFixed(2));
        } else {
            // 売り: 高く売りたい
            const markup = spreadPercent * (1 - aggressiveFactor);
            const limitPrice = price * (1 + markup);
            return Number(limitPrice.toFixed(2));
        }
    }
}

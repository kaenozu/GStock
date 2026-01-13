
import { AnalysisResult, MarketRegime } from '@/types/market';

/**
 * AnalysisResultから自然言語（日本語）の判断根拠を生成する
 */
export function generateReasoning(analysis: AnalysisResult): string {
    const { sentiment, marketRegime, stats, signals, confidence } = analysis;

    const parts: string[] = [];

    // 1. Conclusion & Confidence
    const sentimentJa =
        sentiment === 'BULLISH' ? '強気（買い）' :
            sentiment === 'BEARISH' ? '弱気（売り）' : '中立（様子見）';

    const confidenceLevel =
        confidence >= 80 ? '非常に高い' :
            confidence >= 60 ? '高い' :
                confidence >= 40 ? '中程度' : '低い';

    parts.push(`AIの総合判断は「${sentimentJa}」です。確信度は${confidenceLevel}（${confidence}%）です。`);

    // 2. Market Regime Context
    const regimeMap: Record<MarketRegime, string> = {
        'BULL_TREND': '上昇トレンド',
        'BEAR_TREND': '下降トレンド',
        'SIDEWAYS': 'レンジ相場（方向感なし）',
        'VOLATILE': '高ボラティリティ（乱高下）',
        'SQUEEZE': 'スクイーズ（エネルギー蓄積）'
    };

    const regimeDesc = regimeMap[marketRegime] || marketRegime;
    parts.push(`現在、市場環境（レジーム）を「${regimeDesc}」と認識しています。この環境下では、${getRegimeStrategy(marketRegime)}が推奨されます。`);

    // 3. Technical Indicators Logic
    if (stats) {
        const { rsi, adx, trend } = stats;
        const rsiDesc =
            rsi > 70 ? `RSIが${rsi.toFixed(0)}と「買われすぎ」水準にあり、調整下落のリスクがあります。` :
                rsi < 30 ? `RSIが${rsi.toFixed(0)}と「売られすぎ」水準にあり、反発上昇の可能性があります。` :
                    `RSIは${rsi.toFixed(0)}で、過熱感はありません。`;

        parts.push(`テクニカル面では、${rsiDesc}`);

        if (adx > 25) {
            parts.push(`ADXが${adx.toFixed(0)}を示しており、トレンドの勢いが強まっています。`);
        } else {
            parts.push(`ADXは${adx.toFixed(0)}と低く、明確なトレンドが出ていません。`);
        }
    }

    // 4. Detected Signals
    if (signals && signals.length > 0) {
        const friendlySignals = signals.map(s => translateSignal(s)).filter(s => s);
        if (friendlySignals.length > 0) {
            parts.push(`具体的には、以下のシグナルが検知されました: 「${friendlySignals.join('」「')}」`);
        }
    }

    return parts.join('\n');
}

function getRegimeStrategy(regime: MarketRegime): string {
    switch (regime) {
        case 'BULL_TREND': return '順張り（トレンドフォロー）';
        case 'BEAR_TREND': return '戻り売り、または静観';
        case 'SIDEWAYS': return '逆張り（レンジ取引）';
        case 'VOLATILE': return 'ポジション縮小と慎重なエントリー';
        case 'SQUEEZE': return 'ブレイクアウト待機';
        default: return '基本戦略';
    }
}

function translateSignal(signal: string): string {
    // Common technical signals mapping
    const map: Record<string, string> = {
        'RSI_OVERSOLD': 'RSI売られすぎ',
        'RSI_OVERBOUGHT': 'RSI買われすぎ',
        'RSI_BULLISH_DIV': 'RSI強気ダイバージェンス',
        'RSI_BEARISH_DIV': 'RSI弱気ダイバージェンス',
        'MACD_CROSS_UP': 'MACDゴールデンクロス',
        'MACD_CROSS_DOWN': 'MACDデッドクロス',
        'BB_LOWER_BREAK': 'ボリンジャーバンド下限ブレイク',
        'BB_UPPER_BREAK': 'ボリンジャーバンド上限ブレイク',
        'EMA_CROSS_UP': 'EMAゴールデンクロス',
        'EMA_CROSS_DOWN': 'EMAデッドクロス',
        'TREND_FOLLOW': 'トレンド追随',
        'MEAN_REVERSION': '平均回帰',
    };
    return map[signal] || signal;
}

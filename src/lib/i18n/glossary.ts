
export interface TermDefinition {
    term: string;
    description: string;
    implication: string; // What users should do or understand
}

export type GlossaryKey =
    | 'RSI'
    | 'MACD'
    | 'SMA'
    | 'Confidence'
    | 'Signal'
    | 'MarketRegime'
    | 'BollingerBands'
    | 'ADX';

export const GLOSSARY: Record<GlossaryKey, TermDefinition> = {
    RSI: {
        term: 'RSI (相対力指数)',
        description: '買われすぎ・売られすぎを判断する指標（0〜100）。',
        implication: '70以上は「買われすぎ（反落警戒）」、30以下は「売られすぎ（反発期待）」とされます。'
    },
    MACD: {
        term: 'MACD (移動平均収束拡散)',
        description: 'トレンドの方向と勢いを見る指標。',
        implication: 'ゼロラインより上なら強気、下なら弱気。線が交差（クロス）する地点は売買サインとなります。'
    },
    SMA: {
        term: 'SMA (単純移動平均線)',
        description: '一定期間の平均価格をつないだ線。',
        implication: '価格がこの線より上なら上昇トレンド、下なら下降トレンドの目安です。'
    },
    Confidence: {
        term: 'AI確信度 (Confidence)',
        description: 'AIがその判断にどれだけ自信を持っているかを0-100%で示した確率スコア。',
        implication: '80%以上は高信頼度。50%以下は「迷い」があるため、見送りが賢明です。'
    },
    Signal: {
        term: 'AIシグナル',
        description: '複数のAIエージェントの合議によって決定された最終的な売買推奨。',
        implication: 'BUY（買い）、SELL（売り）、HOLD（様子見）の3種類があります。'
    },
    MarketRegime: {
        term: '市場環境 (Regime)',
        description: '現在の相場全体の雰囲気や状態。',
        implication: '「上昇トレンド」では順張り、「レンジ」では逆張りなど、環境に合わせた戦略が必要です。'
    },
    BollingerBands: {
        term: 'ボリンジャーバンド',
        description: '価格の振れ幅（ボラティリティ）を統計的に表した帯。',
        implication: '価格がバンドの外に出ることは稀なため、バンド（±2σ）にタッチすると反転しやすいとされます。'
    },
    ADX: {
        term: 'ADX (平均方向性指数)',
        description: 'トレンドの「強さ」だけを測る指標。方向は示さない。',
        implication: '25以上で強いトレンドが発生中。25未満はトレンドなし（レンジ）と判断します。'
    }
};

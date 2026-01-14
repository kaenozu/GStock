export interface TermDefinition {
    term: string;
    description: string;
    implication: string;
    category: 'technical' | 'fundamental' | 'risk' | 'portfolio' | 'trading';
}

export type GlossaryKey =
    | 'RSI'
    | 'MACD'
    | 'SMA'
    | 'Confidence'
    | 'Signal'
    | 'MarketRegime'
    | 'BollingerBands'
    | 'ADX'
    | 'Volatility'
    | 'Beta'
    | 'Alpha'
    | 'SharpeRatio'
    | 'MaxDrawdown'
    | 'ProfitFactor'
    | 'WinRate'
    | 'CircuitBreaker'
    | 'LimitOrder'
    | 'StopLoss'
    | 'TakeProfit'
    | 'PositionSizing'
    | 'Rebalancing'
    | 'TaxLossHarvesting'
    | 'DividendYield'
    | 'PE_Ratio'
    | 'MarketCap'
    | 'VWAP'
    | 'Stochastic'
    | 'CCI';

export const GLOSSARY: Record<GlossaryKey, TermDefinition> = {
    RSI: {
        term: 'RSI (相対力指数)',
        description: '買われすぎ・売られすぎを判断する指標（0〜100）。',
        implication: '70以上は「買われすぎ（反落警戒）」、30以下は「売られすぎ（反発期待）」とされます。',
        category: 'technical'
    },
    MACD: {
        term: 'MACD (移動平均収束拡散)',
        description: 'トレンドの方向と勢いを見る指標。',
        implication: 'ゼロラインより上なら強気、下なら弱気。線が交差（クロス）する地点は売買サインとなります。',
        category: 'technical'
    },
    SMA: {
        term: 'SMA (単純移動平均線)',
        description: '一定期間の平均価格をつないだ線。',
        implication: '価格がこの線より上なら上昇トレンド、下なら下降トレンドの目安です。',
        category: 'technical'
    },
    Volatility: {
        term: 'ボラティリティ（変動率）',
        description: '価格がどれくらい激しく動いているかを表す指標。',
        implication: 'ボラティリティが高いほど利益・損失の幅が大きくなるため、リスク管理が重要です。',
        category: 'risk'
    },
    Beta: {
        term: 'ベータ値',
        description: '個別銘柄の株価が市場全体に対してどれくらい敏感に反応するかを示す数値。',
        implication: 'ベータ1.0は市場平均と同じ動き。1.0以上は市場より激しく動く（ハイリスク・ハイリターン）、未満は安定銘柄。',
        category: 'fundamental'
    },
    Alpha: {
        term: 'アルファ',
        description: '市場の動きを除いた、その銘柄・ファンド独自の超過収益率。',
        implication: 'プラスのアルファは市場平均を上回る優れたパフォーマンスを示します。',
        category: 'fundamental'
    },
    SharpeRatio: {
        term: 'シャープレシオ',
        description: 'リスク1単位あたりのリターンを測る指標。',
        implication: '1以上は良好、2以上は優秀とされます。同じリターンなら数値が高いほど効率的な投資です。',
        category: 'risk'
    },
    MaxDrawdown: {
        term: '最大ドローダウン',
        description: 'ピーク（最高値）からどれだけ下落したかの最大幅。',
        implication: '-20%なら「最高値から20%下落した」ことを意味します。この数字が小さいほど安定運用と言えます。',
        category: 'risk'
    },
    ProfitFactor: {
        term: 'プロファクトファクター',
        description: '総利益 ÷ 総損失の比率。',
        implication: '2.0なら「利益が損失の2倍」を意味し、1を上回ればプラス収益です。',
        category: 'trading'
    },
    WinRate: {
        term: '勝率',
        description: '全取引中の利益が出た取引の割合。',
        implication: '50%以上であれば半分以上は勝っていますが、勝率が高くても1敗の損失が大きければ全体はマイナスになる場合があります。',
        category: 'trading'
    },
    Confidence: {
        term: 'AI確信度 (Confidence)',
        description: 'AIがその判断にどれだけ自信を持っているかを0-100%で示した確率スコア。',
        implication: '80%以上は高信頼度。50%以下は「迷い」があるため、見送りが賢明です。',
        category: 'technical'
    },
    Signal: {
        term: 'AIシグナル',
        description: '複数のAIエージェントの合議によって決定された最終的な売買推奨。',
        implication: 'BUY（買い）、SELL（売り）、HOLD（様子見）の3種類があります。',
        category: 'trading'
    },
    MarketRegime: {
        term: '市場環境 (Regime)',
        description: '現在の相場全体の雰囲気や状態。',
        implication: '「上昇トレンド」では順張り、「レンジ」では逆張りなど、環境に合わせた戦略が必要です。',
        category: 'fundamental'
    },
    BollingerBands: {
        term: 'ボリンジャーバンド',
        description: '価格の振れ幅（ボラティリティ）を統計的に表した帯。',
        implication: '価格がバンドの外に出ることは稀なため、バンド（±2σ）にタッチすると反転しやすいとされます。',
        category: 'technical'
    },
    ADX: {
        term: 'ADX (平均方向性指数)',
        description: 'トレンドの「強さ」だけを測る指標。方向は示さない。',
        implication: '25以上で強いトレンドが発生中。25未満はトレンドなし（レンジ）と判断します。',
        category: 'technical'
    },
    CircuitBreaker: {
        term: 'サーキットブレーカー（安全ロック）',
        description: '異常な市場変動や連続損失を防ぐための自動売買停止機能。',
        implication: '設定した損失上限や市場異常時に自動でポジションを閉じ、大きな損失を防ぎます。',
        category: 'risk'
    },
    LimitOrder: {
        term: '指値注文',
        description: '指定した価格になったら自動的に約定する注文。',
        implication: '成行注文よりコストを抑えられますが、約定しないリスクもあります。',
        category: 'trading'
    },
    StopLoss: {
        term: '損切り',
        description: '損失が一定額に達したら自動的にポジションを閉じる注文。',
        implication: '「これ以上損したくない」というラインを予め設定し、感情に流されずに損失を確定します。',
        category: 'risk'
    },
    TakeProfit: {
        term: '利食い',
        description: '利益が一定額に達したら自動的にポジションを閉じる注文。',
        implication: '「これ以上利益を狙うと下がるかも」というラインを設定し、利益を確定させます。',
        category: 'trading'
    },
    PositionSizing: {
        term: 'ポジションサイジング（注文数決定）',
        description: '資金やリスクに応じて、何株・何額買うかを決定する方法。',
        implication: '資金の1〜3%程度のリスクに抑えるのが一般的で、勝ち続けても資産の過半を1銘柄に集中するのは危険です。',
        category: 'portfolio'
    },
    Rebalancing: {
        term: 'リバランス',
        description: 'ポートフォリオの構成比率を当初の目標に戻す調整。',
        implication: '「株式80%・債券20%」の目標が「株式85%・債券15%」にズレた場合、株式を売って債券を買い目標に戻します。',
        category: 'portfolio'
    },
    TaxLossHarvesting: {
        term: 'タックスロスハーベスティング',
        description: '含み損を売却して確定し、税金を減らす戦略。',
        implication: '損失を確定して税額を減らし、代わりのETFなどに再投資します。ただし売買手数料がかかります。',
        category: 'portfolio'
    },
    DividendYield: {
        term: '配当利回り',
        description: '株価に対する年間配当金の割合。',
        implication: '3%なら「株価の3%が年間配当」となります。インカムゲイン重視の方は4%以上を狙うことが多いです。',
        category: 'fundamental'
    },
    PE_Ratio: {
        term: 'PER（株価収益率）',
        description: '株価 ÷ 1株あたり利益。株価が利益の何倍かを表す。',
        implication: '15倍なら「現在の利益が15年で株価に届く」を意味します。15-25倍は適正、40倍以上は割高とされます。',
        category: 'fundamental'
    },
    MarketCap: {
        term: '時価総額',
        description: 'その企業の株式全体の価値。株価 × 発行済株式数。',
        implication: '大型株（1兆円超）は安定、小型株（1000億円未満）は成長性が高いがリスクも高い傾向があります。',
        category: 'fundamental'
    },
    VWAP: {
        term: 'VWAP（出来値加重平均価格）',
        description: 'その日の取引数量を考慮した平均価格。',
        implication: '価格がVWAPより上なら当日は買い方が強い、下なら売り方が強い。プロトレーダーがよく使います。',
        category: 'technical'
    },
    Stochastic: {
        term: 'ストキャスティクス',
        description: '一定期間内で、現在価格が高位圏か低位圏かを見る指標。',
        implication: '80%以上は買われすぎ、20%以下は売られすぎとし、価格反転のシグナルになります。',
        category: 'technical'
    },
    CCI: {
        term: 'CCI (コモディティ・チャネル・インデックス)',
        description: '価格が統計的な範囲からどれくらい逸脱しているかを測る。',
        implication: '+100以上は買われすぎ、-100以下は売られすぎ。0付近であればレンジ相場です。',
        category: 'technical'
    }
};

export const GLOSSARY_CATEGORIES: Record<TermDefinition['category'], GlossaryKey[]> = {
    technical: ['RSI', 'MACD', 'SMA', 'Confidence', 'BollingerBands', 'ADX', 'VWAP', 'Stochastic', 'CCI', 'Volatility'],
    fundamental: ['Beta', 'Alpha', 'MarketRegime', 'PE_Ratio', 'DividendYield', 'MarketCap'],
    risk: ['SharpeRatio', 'MaxDrawdown', 'Volatility', 'CircuitBreaker'],
    portfolio: ['PositionSizing', 'Rebalancing', 'TaxLossHarvesting'],
    trading: ['ProfitFactor', 'WinRate', 'Signal', 'LimitOrder', 'StopLoss', 'TakeProfit']
};

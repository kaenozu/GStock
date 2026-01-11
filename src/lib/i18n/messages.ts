/**
 * メッセージ国際化
 * @description エラーメッセージとUIテキストの日本語化
 * @module lib/i18n/messages
 */

export const messages = {
    errors: {
        // APIエラー
        'Failed to fetch': 'データの取得に失敗しました',
        'Fetch failed': 'データの取得に失敗しました',
        'Network error': 'ネットワークエラーが発生しました',
        'Symbol is required': '銘柄シンボルが必要です',
        'Invalid symbol format': '無効なシンボル形式です',
        'Rate limit exceeded': 'APIレート制限を超過しました',
        'All data providers failed': '全てのデータプロバイダーが失敗しました',
        'Unknown error': '不明なエラーが発生しました',
        'Timeout': 'タイムアウトしました',
        'Server error': 'サーバーエラーが発生しました',
        
        // WebSocketエラー
        'WebSocket connection failed': 'WebSocket接続に失敗しました',
        'WebSocket disconnected': 'WebSocketが切断されました',
        
        // 取引エラー
        'Insufficient funds': '資金が不足しています',
        'Insufficient Holdings': '保有数が不足しています',
        'Trade rejected': '取引が拒否されました',
        'Market closed': '市場が閉じています',
        
        // バリデーション
        'Invalid quantity': '無効な数量です',
        'Invalid price': '無効な価格です',
    },
    
    ui: {
        loading: '読み込み中...',
        scanning: 'スキャン中...',
        analyzing: '分析中...',
        noData: 'データがありません',
        retry: '再試行',
        cancel: 'キャンセル',
        confirm: '確認',
        save: '保存',
        delete: '削除',
        edit: '編集',
        close: '閉じる',
        back: '戻る',
        next: '次へ',
        
        // トレード
        buy: '買い',
        sell: '売り',
        hold: '保持',
        
        // センチメント
        bullish: '強気',
        bearish: '弱気',
        neutral: '中立',
        
        // 市場環境
        bullTrend: '上昇トレンド',
        bearTrend: '下落トレンド',
        sideways: 'レンジ相場',
        volatile: '高ボラティリティ',
        squeeze: 'スクイーズ',
    },
    
    notifications: {
        tradeSuccess: '取引が完了しました',
        tradeFailed: '取引に失敗しました',
        signalDetected: 'シグナルを検出しました',
        connectionLost: '接続が失われました',
        connectionRestored: '接続が復旧しました',
        multipleErrors: '複数の銀柄でエラー',
        dataFetchError: 'データ取得に問題が発生しています',
    },
    
    tooltips: {
        rsi: 'RSI（相対力指数）: 30以下は売られ過ぎ、70以上は買われ過ぎを示します',
        adx: 'ADX（平均方向性指数）: 25以上は強いトレンド、20以下はレンジ相場を示します',
        confidence: '信頼度: AIがこのシグナルにどれだけ自信があるかを示します',
        sentiment: 'センチメント: 市場の方向性に対するAIの判断です',
        paperTrading: 'ペーパートレード: 仮想資金での模擬取引です。実際のお金は動きません',
        watchlist: 'ウォッチリスト: 監視したい銘柄を登録できます',
    },
};

/**
 * エラーメッセージを日本語に変換
 */
export function translateError(error: string): string {
    // 完全一致をチェック
    if (error in messages.errors) {
        return messages.errors[error as keyof typeof messages.errors];
    }
    
    // 部分一致をチェック
    for (const [key, value] of Object.entries(messages.errors)) {
        if (error.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    // 変換できない場合は元のメッセージを返す
    return error;
}

/**
 * センチメントを日本語に変換
 */
export function translateSentiment(sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'): string {
    const map = {
        'BULLISH': messages.ui.bullish,
        'BEARISH': messages.ui.bearish,
        'NEUTRAL': messages.ui.neutral,
    };
    return map[sentiment] || sentiment;
}

/**
 * 市場環境を日本語に変換
 */
export function translateRegime(regime: string): string {
    const map: Record<string, string> = {
        'BULL_TREND': messages.ui.bullTrend,
        'BEAR_TREND': messages.ui.bearTrend,
        'SIDEWAYS': messages.ui.sideways,
        'VOLATILE': messages.ui.volatile,
        'SQUEEZE': messages.ui.squeeze,
    };
    return map[regime] || regime;
}

export default messages;

# GStock 個人利用マニュアル

## 🚀 はじめに

GStockは、個人トレーダー向けのAI駆動型株式トレーディングシステムです。複数のAIエージェントが市場データを分析し、売買シグナルを提供します。

## 📋 目次

1. [システム概要](#システム概要)
2. [インストール](#インストール)
3. [基本的な使用方法](#基本的な使用方法)
4. [AIエージェントの説明](#aiエージェントの説明)
5. [キャッシュ機能](#キャッシュ機能)
6. [トラブルシューティング](#トラブルシューティング)
7. [パフォーマンス最適化](#パフォーマンス最適化)

---

## システム概要

### アーキテクチャ

GStockは以下のコンポーネントで構成されています：

- **AIエージェント**: 7種類のAIエージェントが市場データを分析
- **アンサンブル予測**: 複数のAIエージェントの予測を統合
- **キャッシュシステム**: メモリベースのキャッシュで高速化
- **バックテスト**: 過去データで戦略をテスト
- **ペーパートレーディング**: リスクなしでトレードをシミュレーション

### サポートされているAIエージェント

1. **TrendAgent** (25%): トレンドフォロー戦略
2. **ReversalAgent** (15%): 反転パターン検出
3. **VolatilityAgent** (10%): ボラティリティ分析
4. **SentimentAgent** (20%): ニュースセンチメント分析
5. **MacroAgent** (10%): マクロ経済分析
6. **OptionFlowAgent** (15%): オプションフロー分析

---

## インストール

### 前提条件

- Node.js 18+
- npm 9+

### インストール手順

```bash
# リポジトリをクローン
git clone https://github.com/kaenozu/GStock.git
cd GStock

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env

# .envファイルを編集してAPIキーを設定
nano .env
```

### 必要なAPIキー

以下のAPIサービスのアカウントを作成し、APIキーを取得してください：

- **Finnhub**: 無料プランで十分
- **AlphaVantage**: 無料プランで十分
- **Alpaca** (オプション): ペーパートレーディングのみの場合は不要

### 起動

```bash
# 開発サーバーを起動
npm run dev

# ビルド
npm run build

# 本番サーバーを起動
npm start
```

デフォルトで `http://localhost:3000` にアクセスできます。

---

## 基本的な使用方法

### 1. 価格データの取得

```bash
# 特定の銘柄の価格データを取得
curl "http://localhost:3000/api/stock?symbol=AAPL"
```

### 2. AI予測の取得

```bash
# AI予測を取得
curl "http://localhost:3000/api/predict?symbol=AAPL"
```

### 3. バックテストの実行

```bash
# バックテストを実行
curl "http://localhost:3000/api/backtest?symbol=AAPL&period=1M"
```

### 4. ペーパートレーディング

```bash
# ポートフォリオを確認
curl "http://localhost:3000/api/portfolio"

# 買い注文
curl -X POST "http://localhost:3000/api/trade" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","action":"BUY","quantity":10,"price":150}'

# 売り注文
curl -X POST "http://localhost:3000/api/trade" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","action":"SELL","quantity":10,"price":160}'
```

---

## AIエージェントの説明

### TrendAgent (トレンドフォロー)

**役割**: トレンドフォロー戦略を実装

**分析内容**:
- SMA (Simple Moving Average) 20日/50日
- MACD (Moving Average Convergence Divergence)
- 完全なオーダー（価格 > SMA20 > SMA50）

**重み**: 25%

**最適な市場**: トレンド市場

---

### ReversalAgent (反転パターン検出)

**役割**: 市場の反転パターンを検出

**分析内容**:
- RSI (Relative Strength Index)
- ストキャスティクス
- ボリンジャーバンド

**重み**: 15%

**最適な市場**: レンジ市場

---

### VolatilityAgent (ボラティリティ分析)

**役割**: ボラティリティの変動を分析

**分析内容**:
- ATR (Average True Range)
- ボラティリティブレイクアウト
- ヒストリカルボラティリティ

**重み**: 10%

**最適な市場**: ボラティルな市場

---

### SentimentAgent (ニュースセンチメント)

**役割**: ニュース記事の感情分析

**分析内容**:
- ニュース記事のポジティブ/ネガティブキーワード
- 感情スコアの計算
- 市場センチメントの評価

**重み**: 20%

**最適な市場**: ニュースイベント時

**使用方法**:
```typescript
const newsData = [
  "AAPL reports strong earnings, beating expectations",
  "Tech sector sees significant growth"
];

const result = sentimentAgent.analyze(stockData, undefined, newsData);
```

---

### MacroAgent (マクロ経済分析)

**役割**: マクロ経済指標の分析

**分析内容**:
- 金利
- インフレ率
- GDP成長率
- 失業率

**重み**: 10%

**最適な市場**: マクロ経済イベント時

**使用方法**:
```typescript
const macroData = {
  interestRate: 3.5,
  inflationRate: 2.1,
  gdpGrowth: 2.5,
  unemploymentRate: 4.2
};

const result = macroAgent.analyze(stockData, undefined, macroData);
```

---

### OptionFlowAgent (オプションフロー分析)

**役割**: オプションフローの分析

**分析内容**:
- プット/コール比率
- オープンインタレスト（OI）比率
- インプライドボラティリティ
- 機関投資家の活動

**重み**: 15%

**最適な市場**: オプション市場

**使用方法**:
```typescript
const optionFlow = {
  symbol: 'AAPL',
  date: new Date(),
  callVolume: 10000,
  putVolume: 8000,
  callOI: 50000,
  putOI: 45000,
  impliedVolatility: 25.5,
  institutionalActivity: 'HIGH'
};

const result = optionFlowAgent.analyze(stockData, undefined, optionFlow);
```

---

## アンサンブル予測

### アンサンブル予測とは？

アンサンブル予測は、複数のAIエージェントの予測を統合し、より正確な予測を行う手法です。

### 使用方法

```typescript
import { EnsemblePredictor } from '@/lib/api/EnsemblePredictor';

const predictor = new EnsemblePredictor();

const result = predictor.predict(stockData, {
  marketRegime: 'BULLISH',
  newsData: [...],
  macroData: {...},
  optionFlow: {...},
  customWeights: {
    trend: 0.30,
    sentiment: 0.20,
    // ...
  }
});

console.log(result.finalSignal); // 'BUY' | 'SELL' | 'HOLD'
console.log(result.confidence); // 0-100
console.log(result.agentResults); // 各エージェントの結果
console.log(result.reasoning); // 推論プロセス
```

### 重みの最適化

アンサンブル予測システムは、各エージェントの過去のパフォーマンスに基づいて重みを自動的に調整します。

```typescript
// パフォーマンスを記録
predictor.recordPerformance('trend', true); // 正しい予測
predictor.recordPerformance('sentiment', false); // 間違った予測

// 重みを最適化（10回以上の予測があるエージェントのみ）
predictor.optimizeWeights();

// 重みを確認
console.log(predictor.getWeights());
```

---

## キャッシュ機能

### キャッシュシステム

GStockはメモリベースのキャッシュシステムを使用しています。個人利用には十分な性能を提供します。

### キャッシュ設定

キャッシュは以下の設定で動作します：

- **ストックデータ**: 1分（60秒）
- **ポートフォリオデータ**: 5秒
- **バックテストデータ**: 5分

### キャッシュ管理

```bash
# キャッシュ統計を確認
curl "http://localhost:3000/api/cache"

# キャッシュをクリア
curl -X DELETE "http://localhost:3000/api/cache"
```

### キャッシュの無効化

キャッシュを無効化するには、APIリクエストに `?cache=false` を追加してください。

```bash
curl "http://localhost:3000/api/stock?symbol=AAPL&cache=false"
```

---

## パフォーマンス最適化

### 推奨設定

**個人利用に最適化された設定**:

- ポーリング間隔: 7秒
- キャッシュTTL: ストック（60秒）、ポートフォリオ（5秒）
- AIエージェント重み: デフォルト設定

### パフォーマンスチューニング

1. **CPU使用率の最適化**:
   - ポーリング間隔を調整
   - 使用するAIエージェントを制限

2. **メモリ使用量の最適化**:
   - キャッシュサイズを制限
   - 古いデータを定期的にクリア

3. **APIコストの最適化**:
   - レート制限に注意
   - キャッシュを最大限に活用

---

## トラブルシューティング

### 一般的な問題

#### 問題1: APIキーエラー

**症状**: `API key not configured` エラー

**解決策**:
1. `.env` ファイルを確認
2. APIキーが正しく設定されているか確認
3. APIキーが有効か確認

#### 問題2: キャッシュが動作しない

**症状**: キャッシュが有効にならない

**解決策**:
1. キャッシュミドルウェアが正しく設定されているか確認
2. GETリクエストのみキャッシュされることを確認
3. キャッシュTTLを確認

#### 問題3: AIエージェントの予測が不正確

**症状**: 予測が市場の動きと一致しない

**解決策**:
1. 市場レジームを確認
2. 各エージェントの重みを調整
3. 過去のパフォーマンスを分析

#### 問題4: パフォーマンスが遅い

**症状**: レスポンスが遅い

**解決策**:
1. キャッシュが有効になっているか確認
2. APIのレート制限を確認
3. ポーリング間隔を調整

---

## 詳細情報

### プロジェクト構造

```
GStock/
├── src/
│   ├── agents/           # AIエージェント
│   ├── api/             # APIルート
│   ├── components/      # Reactコンポーネント
│   ├── hooks/           # Reactフック
│   ├── lib/             # ユーティリティライブラリ
│   └── types/           # TypeScript型定義
├── tests/               # テストファイル
├── .env                 # 環境変数
└── package.json         # 依存関係
```

### テスト

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test cache-middleware.test.ts

# テストを監視モードで実行
npm run test:watch
```

### コードスタイル

```bash
# ESLintを実行
npm run lint

# TypeScript型チェック
npx tsc --noEmit
```

---

## サポートと貢献

### バグ報告

バグを見つけた場合は、GitHub Issuesで報告してください。

### 機能リクエスト

新しい機能を提案したい場合は、GitHub Issuesで提案してください。

### 貢献

貢献を歓迎します！プルリクエストを作成する前に、以下の手順に従ってください：

1. フォークする
2. 機能ブランチを作成する
3. 変更をコミットする
4. プッシュする
5. プルリクエストを作成する

---

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。

---

## 更新履歴

### v0.2.0 (2025-01-11)

- ✅ 新しいAIエージェント3種類追加（ニュースセンチメント、マクロ経済、オプションフロー）
- ✅ アンサンブル予測システム実装
- ✅ メモリキャッシュ最適化
- ✅ キャッシュテスト追加
- ✅ 個人利用マニュアル作成

### v0.1.0 (2025-01-10)

- 🚀 初期リリース
- ✅ 基本的なAIエージェント4種類（トレンド、反転、ボラティリティ、ファンダメンタル）
- ✅ バックテスト機能
- ✅ ペーパートレーディング機能
- ✅ キャッシュミドルウェア

---

## よくある質問（FAQ）

### Q: どのAIエージェントが最も正確ですか？

A: 市場の状況によって異なります。トレンド市場ではTrendAgent、レンジ市場ではReversalAgentが優れる傾向があります。アンサンブル予測を使用することで、複数のエージェントの結果を統合できます。

### Q: リアルタイムで予測できますか？

A: はい、リアルタイムで予測できますが、APIのレート制限に注意してください。ポーリング間隔を7秒に設定することで、APIコストを抑えながらリアルタイムに近い予測が可能です。

### Q: 複数の銘柄を同時に監視できますか？

A: はい、複数の銘柄を同時に監視できますが、APIコストとシステム負荷に注意してください。5〜10銘柄程度であれば問題なく動作します。

### Q: 自動売買は可能ですか？

A: はい、Alpacaブローカーを使用して自動売買が可能です。ただし、リスク管理とテストを十分に行ってください。

### Q: 過去のパフォーマンスを確認できますか？

A: はい、バックテスト機能で過去のパフォーマンスを確認できます。また、各AIエージェントの個別のパフォーマンスも記録されています。

---

## お問い合わせ

質問やフィードバックがある場合は、GitHub Issuesまたは以下の連絡先までお問い合わせください。

- GitHub: https://github.com/kaenozu/GStock
- Email: [contact@example.com]

---

**Happy Trading! 🚀📈**

---
name: gstock_expert
description: GStockプロジェクトのエキスパートコンテキストとガイドライン (JSTタイムゾーン, Next.js 16, Agents)
---

# GStock エキスパートスキル

このスキルは、GStockプロジェクトで作業するための重要なコンテキストとワークフローを提供します。新しいタスクを開始するときは、**必ず**これを参照して、プロジェクトの基準に合わせてください。

## 1. プロジェクト憲法 (GEMINI.mdより)

- **言語スキーム**: 出力は**日本語**でなければなりません。
- **コアスタック**:
  - **フレームワーク**: Next.js 16.1.1 (App Router)
  - **言語**: TypeScript
  - **UI**: React 19.2.3, TailwindCSS v4
  - **テスト**: Vitest, Playwright
- **コーディング哲学**:
  - **小さく安全な差分**: 世界を作り変えようとしないでください。外科的な変更を行ってください。
  - **幻覚（ハルシネーション）なし**: APIレスポンスを捏造しないでください。スキーマがわからない場合は、尋ねるか `grep_search` を使用してください。
  - **GitHub**: すべてのGitHub操作（`gh pr create` など）に `gh` CLI を使用してください。

## 2. アーキテクチャ概要

### エージェント (`src/lib/agents`)
コアロジックは自律エージェントに存在します。
- **BaseAgent**: すべてのエージェントはこのクラスを継承します。
- **パターン**: エージェントは `StockDataPoint[]` を分析し、`AgentResult` (シグナル, 自信度, 理由) を返します。
- **主要ファイル**:
  - `src/lib/agents/types.ts`: エージェント用の共有型定義。
  - `src/lib/agents/BaseAgent.ts`: 基底クラス。

### UIコンポーネント (`src/components`)
- フックを使用した **関数コンポーネント** を使用してください。
- スタイリング: Tailwindユーティリティクラスを使用してください。
- チャート: `lightweight-charts`。

### API ルート (`src/app/api`)
- Next.js App Router ハンドラー (`route.ts`)。
- 堅牢なエラーハンドリングと型検証 (Zod) を確保してください。

## 3. 一般的なワークフロー

### 開発
```bash
npm run dev
```

### テスト
- **単体テスト**: `npm test` (Vitest)
- **E2Eテスト**: `npm run test:e2e` (Playwright)

### 新しいエージェントの作成
1. `src/lib/agents/NewAgentNameAgent.ts` を作成します。
2. `BaseAgent` を継承します。
3. `analyze` メソッドを実装します。
4. 単体テスト `src/lib/agents/NewAgentNameAgent.test.ts` を追加します。

## 4. 重要なライブラリ
- **Yahoo Finance 2**: リアルタイムデータ取得。
- **Technical Indicators**: RSI, MACDなどの計算。
- **Better SQLite3**: ローカルデータの永続化。

## 5. トラブルシューティング
- **インポートエラー**: エイリアス (`@/types`, `@/lib`) を確認してください。`tsconfig.json` のパスが尊重されていることを確認してください。
- **ハイドレーションエラー**: サーバーとクライアントの間でレンダリングが一貫していることを確認してください（React 19での日付/ランダム性でよくある問題）。

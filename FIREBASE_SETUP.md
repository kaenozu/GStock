# Firebase本番環境設定ガイド

## 手順

### 1. Firebaseプロジェクト作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを作成（GStock）
3. Google Analyticsの設定（必要に応じて）

### 2. Webアプリの追加
1. Firebase Consoleで「Webアプリ」を選択
2. アプリ名を入力（例：gstock-web）
3. アプリを登録
4. Firebase SDK設定スニペットをコピー

### 3. Cloud Messaging設定
1. Firebase Consoleで「Cloud Messaging」を選択
2. 「Webプッシュ証明書」を生成
3. VAPID公開鍵と秘密鍵をメモ

### 4. 環境変数の設定
Firebase Consoleから取得した情報を`.env.local`に追加：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# VAPID Keys (Cloud Messagingで生成されたキーを使用)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### 5. Service Workerの公開
Firebase SDKで提供された`firebase-messaging-sw.js`を`public/`ディレクトリに配置

### 6. 本番環境の設定（Vercelの場合）
Vercelの環境変数に以下を追加：

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

### 7. テスト
1. アプリをデプロイ
2. プッシュ通知を有効化
3. Firebase Consoleからテストメッセージを送信

## 注意点

- **VAPIDキー**: 本番環境では、Firebase Consoleで生成したVAPIDキーを使用
- **Service Worker**: 本番環境でも正しく動作するように、`public/`ディレクトリに配置
- **HTTPS**: プッシュ通知はHTTPS環境でのみ動作（localhostは例外）
- **ブラウザサポート**: Chrome、Firefox、Safari（プッシュ通知をサポート）

## 参考ドキュメント

- [Firebase Cloud Messaging ドキュメント](https://firebase.google.com/docs/cloud-messaging)
- [WebアプリへのFCMの追加](https://firebase.google.com/docs/cloud-messaging/js/client)
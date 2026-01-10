import { NextRequest, NextResponse } from 'next/server';
import { IncomingMessage, ServerResponse } from 'http';
import { Duplex } from 'stream';

// WebSocketサーバー実装
class WebSocketServer {
  private clients = new Map<string, { ws: any; lastPing: number }>();
  private pingInterval = 30000; // 30秒ごとにping

  constructor() {
    // pingタイマーを開始
    setInterval(() => {
      this.pingClients();
    }, this.pingInterval);
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    // WebSocketアップグレードを処理
    const { socket: ws, request } = this.upgradeWebSocket(req, socket, head);
    
    if (!ws) {
      return;
    }

    const clientId = this.generateClientId();
    const client = { ws, lastPing: Date.now() };

    this.clients.set(clientId, client);

    console.log(`WebSocket client connected: ${clientId}`);

    // メッセージハンドラを設定
    ws.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // ウェルカムメッセージを送信
    this.sendToClient(clientId, {
      type: 'WELCOME',
      clientId,
      timestamp: Date.now()
    });
  }

  private upgradeWebSocket(req: IncomingMessage, socket: Duplex, head: Buffer) {
    // 簡単なWebSocketハンドシェイク
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      return { socket: null, request: null };
    }

    const acceptKey = this.generateAcceptKey(key);
    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ].join('\r\n');

    socket.write(response);

    return { socket, request: req };
  }

  private generateAcceptKey(key: string): string {
    const crypto = require('crypto');
    const sha1 = crypto.createHash('sha1');
    sha1.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
    return sha1.digest('base64');
  }

  private generateClientId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private handleMessage(clientId: string, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Message from ${clientId}:`, message);

      switch (message.type) {
        case 'SUBSCRIBE':
          this.handleSubscribe(clientId, message.symbol);
          break;
        case 'UNSUBSCRIBE':
          this.handleUnsubscribe(clientId, message.symbol);
          break;
        case 'GET_PORTFOLIO':
          this.handlePortfolioRequest(clientId);
          break;
        case 'SUBSCRIBE_ANALYSIS':
          this.handleAnalysisSubscribe(clientId, message.symbols);
          break;
      }
    } catch (error) {
      console.error(`Error handling message from ${clientId}:`, error);
    }
  }

  private handleSubscribe(clientId: string, symbol: string) {
    console.log(`Client ${clientId} subscribed to ${symbol}`);
    this.sendToClient(clientId, {
      type: 'SUBSCRIPTION_CONFIRMED',
      symbol,
      timestamp: Date.now()
    });

    // ダミーデータを送信（実際は外部APIから取得）
    this.simulateStockUpdate(clientId, symbol);
  }

  private handleUnsubscribe(clientId: string, symbol: string) {
    console.log(`Client ${clientId} unsubscribed from ${symbol}`);
    this.sendToClient(clientId, {
      type: 'UNSUBSCRIPTION_CONFIRMED',
      symbol,
      timestamp: Date.now()
    });
  }

  private handlePortfolioRequest(clientId: string) {
    // ポートフォリオデータを取得して送信
    // 実際の実装ではデータベースやAPIから取得
    this.sendToClient(clientId, {
      type: 'PORTFOLIO_DATA',
      data: {
        // ダミーポートフォリオデータ
        cash: 1000000,
        equity: 1050000,
        positions: [],
        trades: []
      },
      timestamp: Date.now()
    });
  }

  private handleAnalysisSubscribe(clientId: string, symbols: string[]) {
    console.log(`Client ${clientId} subscribed to analysis for:`, symbols);
    this.sendToClient(clientId, {
      type: 'ANALYSIS_SUBSCRIPTION_CONFIRMED',
      symbols,
      timestamp: Date.now()
    });
  }

  private simulateStockUpdate(clientId: string, symbol: string) {
    // 5秒ごとにダミーデータを送信（実装は削除）
    const interval = setInterval(() => {
      const price = 100 + Math.random() * 50;
      const change = (Math.random() - 0.5) * 2;
      
      this.sendToClient(clientId, {
        type: 'STOCK_UPDATE',
        symbol,
        data: {
          price: parseFloat(price.toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat((change / price * 100).toFixed(2)),
          volume: Math.floor(Math.random() * 1000000),
          timestamp: Date.now()
        }
      });
    }, 5000);

    // クライアントが切断されたらクリーンアップ
    setTimeout(() => {
      clearInterval(interval);
    }, 60000);
  }

  private sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(JSON.stringify(data));
    }
  }

  private pingClients() {
    const now = Date.now();
    
    this.clients.forEach((client, clientId) => {
      if (now - client.lastPing > this.pingInterval * 2) {
        // 60秒以上応答がないクライアントを切断
        console.log(`Client ${clientId} timeout, disconnecting`);
        client.ws.terminate();
        this.clients.delete(clientId);
      } else {
        // pingを送信
        this.sendToClient(clientId, {
          type: 'PING',
          timestamp: now
        });
      }
    });
  }

  broadcastToAll(message: any) {
    this.clients.forEach((_, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  broadcastToSymbol(symbol: string, message: any) {
    this.clients.forEach((client, clientId) => {
      // シンボルを購読しているクライアントにのみ送信
      // 実際の実装では購読情報を管理する必要あり
      this.sendToClient(clientId, message);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// WebSocketサーバーインスタンス
const wsServer = new WebSocketServer();

// Next.js APIルートハンドラ
export async function GET(req: NextRequest) {
  // WebSocketアップグレードリクエスト
  if (req.headers.get('upgrade') === 'websocket') {
    const { socket, response } = await upgradeToWebSocket(req);
    
    if (socket) {
      wsServer.handleUpgrade(
        req as any as IncomingMessage,
        socket as any,
        Buffer.alloc(0)
      );
      
      return response;
    }
  }

  // 通常のHTTPリクエスト（ステータス確認など）
  return NextResponse.json({
    status: 'WebSocket server running',
    clients: wsServer.getClientCount(),
    timestamp: new Date().toISOString()
  });
}

async function upgradeToWebSocket(req: NextRequest): Promise<{ socket: any; response: NextResponse }> {
  // Next.js 13+でWebSocketを扱うための処理
  // 実際の実装ではEdge Runtimeを使用するか、別のWebSocketサーバーを立てる
  return {
    socket: null,
    response: NextResponse.json({ error: 'WebSocket upgrade not supported in this deployment' })
  };
}

// 外部からアクセスできるエクスポート
export { wsServer };
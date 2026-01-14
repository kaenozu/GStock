import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import WebSocket from 'ws';
import { FinnhubMessageSchema, NormalizedPrice } from '@/lib/websocket/schemas';

/**
 * WebSocket Proxy Server
 * @description Finnhub WebSocketへのプロキシ。APIキーをサーバー側で保持し、
 *              クライアントには露出させない。
 */
export class SocketServer {
    private io: IOServer;
    private finnhubWs: WebSocket | null = null;
    private subscribedSymbols: Map<string, Set<string>> = new Map(); // symbol -> Set<socketId>
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pingTimer: NodeJS.Timeout | null = null;
    private isConnecting = false;

    constructor(server: HttpServer) {
        this.io = new IOServer(server, {
            path: '/api/socket/io',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.setupSocketIO();
        this.connectToFinnhub();
    }

    /**
     * Socket.IOイベントハンドラの設定
     */
    private setupSocketIO() {
        this.io.on('connection', (socket: Socket) => {
            console.log('[SocketServer] Client connected:', socket.id);

            socket.on('subscribe', (symbol: string) => {
                const upperSymbol = symbol.toUpperCase();
                console.log(`[SocketServer] Client ${socket.id} subscribed to ${upperSymbol}`);
                
                socket.join(upperSymbol);
                
                // Track subscription
                if (!this.subscribedSymbols.has(upperSymbol)) {
                    this.subscribedSymbols.set(upperSymbol, new Set());
                    // Subscribe to Finnhub
                    this.finnhubSubscribe(upperSymbol);
                }
                this.subscribedSymbols.get(upperSymbol)!.add(socket.id);
            });

            socket.on('unsubscribe', (symbol: string) => {
                const upperSymbol = symbol.toUpperCase();
                console.log(`[SocketServer] Client ${socket.id} unsubscribed from ${upperSymbol}`);
                
                socket.leave(upperSymbol);
                
                // Update tracking
                const subscribers = this.subscribedSymbols.get(upperSymbol);
                if (subscribers) {
                    subscribers.delete(socket.id);
                    if (subscribers.size === 0) {
                        this.subscribedSymbols.delete(upperSymbol);
                        this.finnhubUnsubscribe(upperSymbol);
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log('[SocketServer] Client disconnected:', socket.id);
                
                // Cleanup subscriptions
                for (const [symbol, subscribers] of this.subscribedSymbols.entries()) {
                    subscribers.delete(socket.id);
                    if (subscribers.size === 0) {
                        this.subscribedSymbols.delete(symbol);
                        this.finnhubUnsubscribe(symbol);
                    }
                }
            });
        });
    }

    /**
     * Finnhub WebSocketに接続
     */
    private connectToFinnhub() {
        const apiKey = process.env.FINNHUB_API_KEY;
        
        if (!apiKey) {
            console.warn('[SocketServer] FINNHUB_API_KEY not set. Realtime prices disabled.');
            return;
        }

        if (this.isConnecting || this.finnhubWs?.readyState === WebSocket.OPEN) {
            return;
        }

        this.isConnecting = true;
        console.log('[SocketServer] Connecting to Finnhub WebSocket...');

        try {
            this.finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

            this.finnhubWs.on('open', () => {
                console.log('[SocketServer] Finnhub WebSocket connected');
                this.isConnecting = false;
                
                // Resubscribe existing symbols
                for (const symbol of this.subscribedSymbols.keys()) {
                    this.finnhubSubscribe(symbol);
                }

                // Start ping timer
                this.startPingTimer();
            });

            this.finnhubWs.on('message', (data: WebSocket.RawData) => {
                this.handleFinnhubMessage(data.toString());
            });

            this.finnhubWs.on('error', (error) => {
                console.error('[SocketServer] Finnhub WebSocket error:', error.message);
                this.isConnecting = false;
            });

            this.finnhubWs.on('close', (code, reason) => {
                console.log(`[SocketServer] Finnhub WebSocket closed: ${code} ${reason}`);
                this.isConnecting = false;
                this.clearTimers();
                this.scheduleReconnect();
            });

        } catch (error) {
            console.error('[SocketServer] Failed to create Finnhub WebSocket:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Finnhubメッセージを処理してクライアントに転送
     */
    private handleFinnhubMessage(data: string) {
        try {
            const json = JSON.parse(data);
            const result = FinnhubMessageSchema.safeParse(json);

            if (!result.success) {
                return;
            }

            const message = result.data;

            if (message.type === 'trade' && message.data) {
                for (const trade of message.data) {
                    const normalizedPrice: NormalizedPrice = {
                        symbol: trade.s,
                        price: trade.p,
                        volume: trade.v,
                        timestamp: trade.t,
                    };

                    // Emit to all clients subscribed to this symbol
                    this.io.to(trade.s).emit('price_update', normalizedPrice);
                }
            }
        } catch (error) {
            // Ignore parse errors
        }
    }

    /**
     * Finnhubにシンボルを購読
     */
    private finnhubSubscribe(symbol: string) {
        if (this.finnhubWs?.readyState === WebSocket.OPEN) {
            this.finnhubWs.send(JSON.stringify({ type: 'subscribe', symbol }));
            console.log(`[SocketServer] Subscribed to Finnhub: ${symbol}`);
        }
    }

    /**
     * Finnhubのシンボル購読を解除
     */
    private finnhubUnsubscribe(symbol: string) {
        if (this.finnhubWs?.readyState === WebSocket.OPEN) {
            this.finnhubWs.send(JSON.stringify({ type: 'unsubscribe', symbol }));
            console.log(`[SocketServer] Unsubscribed from Finnhub: ${symbol}`);
        }
    }

    /**
     * 再接続スケジュール
     */
    private scheduleReconnect() {
        if (this.reconnectTimer) return;

        console.log('[SocketServer] Scheduling reconnect in 5s...');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectToFinnhub();
        }, 5000);
    }

    /**
     * Pingタイマー開始
     */
    private startPingTimer() {
        this.clearTimers();
        this.pingTimer = setInterval(() => {
            if (this.finnhubWs?.readyState === WebSocket.OPEN) {
                this.finnhubWs.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    /**
     * タイマーをクリア
     */
    private clearTimers() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * サーバーシャットダウン
     */
    public shutdown() {
        this.clearTimers();
        if (this.finnhubWs) {
            this.finnhubWs.close();
            this.finnhubWs = null;
        }
        this.io.close();
    }
}

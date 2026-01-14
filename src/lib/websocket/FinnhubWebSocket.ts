/**
 * Finnhub WebSocket Client
 * @description FinnhubのWebSocket APIを使用したリアルタイム価格データ取得
 * @module lib/websocket/FinnhubWebSocket
 * 
 * @deprecated このクラスはクライアント側で直接使用しないでください。
 *             APIキー漏洩のリスクがあります。
 *             代わりに socket-server.ts のプロキシ経由で接続してください。
 *             クライアントは useRealtimePrice フックを使用してください。
 */

import {
    FinnhubMessageSchema,
    NormalizedPrice,
    ConnectionStatus,
} from './schemas';

/** WebSocketイベントハンドラ */
type PriceHandler = (price: NormalizedPrice) => void;
type StatusHandler = (status: ConnectionStatus) => void;
type ErrorHandler = (error: string) => void;

/** 接続設定 */
interface WebSocketConfig {
    /** 再接続間隔（ミリ秒） */
    reconnectInterval: number;
    /** 最大再接続回数 */
    maxReconnectAttempts: number;
    /** ping間隔（ミリ秒） */
    pingInterval: number;
}

/** デフォルト設定 */
const DEFAULT_CONFIG: WebSocketConfig = {
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    pingInterval: 30000,
};

/**
 * Finnhub WebSocketクライアント
 * @class FinnhubWebSocket
 */
export class FinnhubWebSocket {
    private ws: WebSocket | null = null;
    private apiKey: string;
    private config: WebSocketConfig;
    private subscribedSymbols: Set<string> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private status: ConnectionStatus = 'disconnected';

    // イベントハンドラ
    private priceHandlers: Set<PriceHandler> = new Set();
    private statusHandlers: Set<StatusHandler> = new Set();
    private errorHandlers: Set<ErrorHandler> = new Set();

    /**
     * @param apiKey - Finnhub APIキー
     * @param config - 接続設定
     */
    constructor(apiKey: string, config?: Partial<WebSocketConfig>) {
        this.apiKey = apiKey;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * WebSocket接続を開始
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[FinnhubWS] Already connected');
            return;
        }

        if (!this.apiKey) {
            this.emitError('API key is required');
            return;
        }

        this.setStatus('connecting');

        try {
            this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);
            this.setupEventListeners();
        } catch (error) {
            this.emitError(`Connection failed: ${error}`);
            this.scheduleReconnect();
        }
    }

    /**
     * WebSocket接続を切断
     */
    disconnect(): void {
        this.clearTimers();
        this.reconnectAttempts = 0;

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.setStatus('disconnected');
    }

    /**
     * シンボルを購読
     * @param symbol - 銘柄シンボル
     */
    subscribe(symbol: string): void {
        const upperSymbol = symbol.toUpperCase();
        this.subscribedSymbols.add(upperSymbol);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendSubscribe(upperSymbol);
        }
    }

    /**
     * シンボルの購読を解除
     * @param symbol - 銘柄シンボル
     */
    unsubscribe(symbol: string): void {
        const upperSymbol = symbol.toUpperCase();
        this.subscribedSymbols.delete(upperSymbol);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendUnsubscribe(upperSymbol);
        }
    }

    /**
     * 全ての購読を解除
     */
    unsubscribeAll(): void {
        for (const symbol of this.subscribedSymbols) {
            this.unsubscribe(symbol);
        }
    }

    /**
     * 価格イベントハンドラを登録
     */
    onPrice(handler: PriceHandler): () => void {
        this.priceHandlers.add(handler);
        return () => this.priceHandlers.delete(handler);
    }

    /**
     * ステータスイベントハンドラを登録
     */
    onStatus(handler: StatusHandler): () => void {
        this.statusHandlers.add(handler);
        return () => this.statusHandlers.delete(handler);
    }

    /**
     * エラーイベントハンドラを登録
     */
    onError(handler: ErrorHandler): () => void {
        this.errorHandlers.add(handler);
        return () => this.errorHandlers.delete(handler);
    }

    /**
     * 現在の接続ステータスを取得
     */
    getStatus(): ConnectionStatus {
        return this.status;
    }

    /**
     * 購読中のシンボルを取得
     */
    getSubscribedSymbols(): string[] {
        return Array.from(this.subscribedSymbols);
    }

    // --- Private Methods ---

    private setupEventListeners(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('[FinnhubWS] Connected');
            this.setStatus('connected');
            this.reconnectAttempts = 0;

            // 保留中の購読を復元
            for (const symbol of this.subscribedSymbols) {
                this.sendSubscribe(symbol);
            }

            // Pingタイマー開始
            this.startPingTimer();
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.ws.onerror = (event) => {
            console.error('[FinnhubWS] Error:', event);
            this.emitError('WebSocket error occurred');
        };

        this.ws.onclose = (event) => {
            console.log(`[FinnhubWS] Closed: ${event.code} ${event.reason}`);
            this.clearTimers();

            if (this.status !== 'disconnected') {
                this.setStatus('disconnected');
                this.scheduleReconnect();
            }
        };
    }

    private handleMessage(data: string): void {
        try {
            const json = JSON.parse(data);
            const result = FinnhubMessageSchema.safeParse(json);

            if (!result.success) {
                console.warn('[FinnhubWS] Invalid message:', result.error);
                return;
            }

            const message = result.data;

            switch (message.type) {
                case 'trade':
                    if (message.data) {
                        for (const trade of message.data) {
                            const normalizedPrice: NormalizedPrice = {
                                symbol: trade.s,
                                price: trade.p,
                                volume: trade.v,
                                timestamp: trade.t,
                            };
                            this.emitPrice(normalizedPrice);
                        }
                    }
                    break;

                case 'ping':
                    // Pingは無視
                    break;

                case 'error':
                    this.emitError(message.msg || 'Unknown error');
                    break;
            }
        } catch (error) {
            console.error('[FinnhubWS] Parse error:', error);
        }
    }

    private sendSubscribe(symbol: string): void {
        this.send({ type: 'subscribe', symbol });
    }

    private sendUnsubscribe(symbol: string): void {
        this.send({ type: 'unsubscribe', symbol });
    }

    private send(data: object): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private setStatus(status: ConnectionStatus): void {
        this.status = status;
        for (const handler of this.statusHandlers) {
            handler(status);
        }
    }

    private emitPrice(price: NormalizedPrice): void {
        for (const handler of this.priceHandlers) {
            handler(price);
        }
    }

    private emitError(error: string): void {
        this.setStatus('error');
        for (const handler of this.errorHandlers) {
            handler(error);
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.log('[FinnhubWS] Max reconnect attempts reached');
            this.emitError('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval * this.reconnectAttempts;

        console.log(`[FinnhubWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    private startPingTimer(): void {
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
            }
        }, this.config.pingInterval);
    }

    private clearTimers(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
}

import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { FinnhubWebSocket } from '@/lib/websocket/FinnhubWebSocket';
import { NormalizedPrice } from '@/lib/websocket/schemas';

export class SocketServer {
    private io: IOServer;
    private finnhubWS: FinnhubWebSocket | null = null;
    private interval: NodeJS.Timeout | null = null;
    private watchedSymbols: Set<string> = new Set();
    private apiKey: string;

    constructor(server: HttpServer) {
        this.apiKey = process.env.FINNHUB_API_KEY || '';

        if (!this.apiKey) {
            console.warn('[SocketServer] FINNHUB_API_KEY not set, using mock data');
        } else {
            this.initializeFinnhubWebSocket();
        }

        this.io = new IOServer(server, {
            path: '/api/socket/io',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.setupSocket();

        if (!this.apiKey) {
            this.startSimulation();
        }
    }

    private initializeFinnhubWebSocket(): void {
        this.finnhubWS = new FinnhubWebSocket(this.apiKey);

        this.finnhubWS.onPrice((price: NormalizedPrice) => {
            this.io.to(price.symbol).emit('price', {
                symbol: price.symbol,
                price: price.price,
                timestamp: price.timestamp,
                volume: price.volume
            });
        });

        this.finnhubWS.onStatus((status) => {
            console.log(`[SocketServer] Finnhub WS status: ${status}`);
            this.io.emit('finnhub_status', status);
        });

        this.finnhubWS.onError((error) => {
            console.error('[SocketServer] Finnhub WS error:', error);
            this.io.emit('finnhub_error', error);
            this.startSimulation();
        });

        this.finnhubWS.connect();
    }

    private setupSocket() {
        this.io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);

            socket.on('subscribe', (symbol: string) => {
                const upperSymbol = symbol.toUpperCase();
                console.log(`Client ${socket.id} subscribed to ${upperSymbol}`);
                socket.join(upperSymbol);
                this.watchedSymbols.add(upperSymbol);

                if (this.finnhubWS) {
                    this.finnhubWS.subscribe(upperSymbol);
                }
            });

            socket.on('unsubscribe', (symbol: string) => {
                const upperSymbol = symbol.toUpperCase();
                console.log(`Client ${socket.id} unsubscribed from ${upperSymbol}`);
                socket.leave(upperSymbol);

                if (this.finnhubWS) {
                    this.finnhubWS.unsubscribe(upperSymbol);
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });

            socket.emit('connection_status', {
                usingMockData: !this.apiKey,
                finnhubConnected: this.finnhubWS?.getStatus() === 'connected'
            });
        });
    }

    private startSimulation() {
        if (this.interval) clearInterval(this.interval);
        if (this.finnhubWS) {
            this.finnhubWS.disconnect();
            this.finnhubWS = null;
        }

        console.log('[SocketServer] Starting mock price simulation');

        this.interval = setInterval(() => {
            if (this.watchedSymbols.size === 0) return;

            this.watchedSymbols.forEach(symbol => {
                const change = (Math.random() * 0.4) - 0.2;

                this.io.to(symbol).emit('price', {
                    symbol: symbol,
                    price: 0,
                    changePercent: change,
                    timestamp: new Date().toISOString(),
                    isMock: true
                });
            });
        }, 1000);
    }

    public getFinnhubStatus() {
        return this.finnhubWS?.getStatus() || 'disconnected';
    }
}

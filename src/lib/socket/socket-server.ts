import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';

export class SocketServer {
    private io: IOServer;
    private interval: NodeJS.Timeout | null = null;
    private watchedSymbols: Set<string> = new Set();

    constructor(server: HttpServer) {
        this.io = new IOServer(server, {
            path: '/api/socket/io',
            addTrailingSlash: false,
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.setupSocket();
        this.startSimulation();
    }

    private setupSocket() {
        this.io.on('connection', (socket: Socket) => {
            console.log('Client connected:', socket.id);

            socket.on('subscribe', (symbol: string) => {
                console.log(`Client ${socket.id} subscribed to ${symbol}`);
                socket.join(symbol);
                this.watchedSymbols.add(symbol);
            });

            socket.on('unsubscribe', (symbol: string) => {
                console.log(`Client ${socket.id} unsubscribed from ${symbol}`);
                socket.leave(symbol);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    // Mock Price Simulation (Heartbeat)
    // In production, this would be triggered by a real data stream (e.g., Redis pub/sub)
    private startSimulation() {
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            if (this.watchedSymbols.size === 0) return;

            this.watchedSymbols.forEach(symbol => {
                // Emit a mock price update
                // Variation: -0.2% to +0.2%
                const change = (Math.random() * 0.4) - 0.2;

                this.io.to(symbol).emit('price_update', {
                    symbol: symbol,
                    price: 0, // In a real app, we'd track the current price. For now, we just emit a "tick" signal or need a base price.
                    // Better: Let's emit a change percentage or just a signal that "update available"
                    changePercent: change,
                    timestamp: new Date().toISOString()
                });
            });
        }, 1000); // 1 second heartbeat
    }
}

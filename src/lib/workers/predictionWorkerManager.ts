export interface PredictionWorkerMessage {
    type: 'CALCULATE_PREDICTIONS' | 'CALCULATE_INDICATORS' | 'CALCULATE_REGIME';
    data: {
        stockData: any[];
    };
}

export interface PredictionWorkerResponse {
    type: 'PREDICTIONS_COMPLETE' | 'INDICATORS_COMPLETE' | 'REGIME_COMPLETE' | 'ERROR';
    data: any;
    error?: string;
}

export class PredictionWorkerManager {
    private worker: Worker | null = null;
    private pendingRequests = new Map<string, {
        resolve: (value: any) => void;
        reject: (error: any) => void;
        timeout: NodeJS.Timeout;
    }>();
    private requestIdCounter = 0;

    constructor() {
        if (typeof window === 'undefined') return;

        try {
            this.worker = new Worker(new URL('../workers/predictionWorker.ts', import.meta.url), {
                type: 'module'
            });

            this.worker.onmessage = this.handleMessage.bind(this);
            this.worker.onerror = this.handleError.bind(this);

            console.log('[PredictionWorker] Worker initialized');
        } catch (error) {
            console.error('[PredictionWorker] Failed to initialize worker:', error);
        }
    }

    private async handleMessage(event: MessageEvent) {
        const { type, data, error, requestId } = event.data;

        const request = this.pendingRequests.get(requestId);
        if (!request) {
            console.warn(`[PredictionWorker] No pending request for ${requestId}`);
            return;
        }

        clearTimeout(request.timeout);
        this.pendingRequests.delete(requestId);

        if (type === 'ERROR' || error) {
            request.reject(new Error(error || 'Worker error'));
        } else {
            request.resolve(data);
        }
    }

    private handleError(error: ErrorEvent) {
        console.error('[PredictionWorker] Worker error:', error);
    }

    async calculatePredictions(stockData: any[]): Promise<any> {
        return this.sendMessage('CALCULATE_PREDICTIONS', { stockData });
    }

    async calculateIndicators(stockData: any[]): Promise<any> {
        return this.sendMessage('CALCULATE_INDICATORS', { stockData });
    }

    async calculateRegime(stockData: any[]): Promise<any> {
        return this.sendMessage('CALCULATE_REGIME', { stockData });
    }

    private async sendMessage(type: string, data: any): Promise<any> {
        if (!this.worker) {
            throw new Error('Worker not initialized');
        }

        const requestId = `req_${this.requestIdCounter++}`;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error('Worker request timeout'));
            }, 30000); // 30秒タイムアウト

            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            this.worker!.postMessage({
                type,
                data,
                requestId
            } as PredictionWorkerMessage & { requestId: string });
        });
    }

    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        this.pendingRequests.forEach(({ timeout, reject }) => {
            clearTimeout(timeout);
            reject(new Error('Worker terminated'));
        });
        this.pendingRequests.clear();
    }
}

export const predictionWorkerManager = new PredictionWorkerManager();

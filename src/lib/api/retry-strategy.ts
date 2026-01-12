export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryableErrors?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
    data: T;
    attempts: number;
    totalDelay: number;
}

export class RetryStrategy {
    private readonly maxRetries: number;
    private readonly initialDelay: number;
    private readonly maxDelay: number;
    private readonly backoffFactor: number;
    private readonly retryableErrors: (error: unknown) => boolean;

    constructor(options: RetryOptions = {}) {
        this.maxRetries = options.maxRetries ?? 3;
        this.initialDelay = options.initialDelay ?? 1000;
        this.maxDelay = options.maxDelay ?? 30000;
        this.backoffFactor = options.backoffFactor ?? 2;
        this.retryableErrors = options.retryableErrors ?? this.defaultRetryableErrors;
    }

    async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
        let lastError: unknown;
        let attempts = 0;
        let totalDelay = 0;

        for (let i = 0; i <= this.maxRetries; i++) {
            attempts = i + 1;

            try {
                const data = await operation();
                return { data, attempts, totalDelay };
            } catch (error) {
                lastError = error;

                if (!this.retryableErrors(error)) {
                    throw error;
                }

                if (i === this.maxRetries) {
                    throw error;
                }

                const delay = this.calculateDelay(i);
                totalDelay += delay;

                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    private calculateDelay(attempt: number): number {
        const delay = this.initialDelay * Math.pow(this.backoffFactor, attempt);
        return Math.min(delay, this.maxDelay);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private defaultRetryableErrors(error: unknown): boolean {
        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            
            const retryableMessages = [
                'network error',
                'timeout',
                'econnrefused',
                'enotfound',
                'etimedout',
                'fetch failed',
                'rate limit',
                'too many requests',
                '429',
                '500',
                '502',
                '503',
                '504'
            ];

            return retryableMessages.some(msg => errorMessage.includes(msg));
        }

        if (error instanceof TypeError) {
            return true;
        }

        return false;
    }
}

export const defaultRetryStrategy = new RetryStrategy({
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
});

export const aggressiveRetryStrategy = new RetryStrategy({
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 5000,
    backoffFactor: 1.5
});

export const conservativeRetryStrategy = new RetryStrategy({
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 3
});

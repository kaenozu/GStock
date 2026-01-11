import { z } from 'zod';

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: Record<string, string[]>;
}

export class ValidationError extends Error {
    public errors: Record<string, string[]>;

    constructor(errors: Record<string, string[]>) {
        super('Validation failed');
        this.errors = errors;
        this.name = 'ValidationError';
    }
}

export function validateRequestBody<T>(
    schema: z.ZodSchema<T>,
    body: unknown
): ValidationResult<T> {
    try {
        const data = schema.parse(body);
        return { success: true, data };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors: Record<string, string[]> = {};
            
            error.errors.forEach((err) => {
                const path = err.path.join('.') || 'root';
                if (!errors[path]) {
                    errors[path] = [];
                }
                errors[path].push(err.message);
            });

            return { success: false, errors };
        }

        return {
            success: false,
            errors: { root: ['不明なエラーが発生しました'] },
        };
    }
}

export function createValidationResponse(errors: Record<string, string[]>): Response {
    return new Response(
        JSON.stringify({
            success: false,
            error: 'バリデーションエラー',
            details: errors,
        }),
        {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function validateApiKey(apiKey: string): boolean {
    const apiKeyRegex = /^[a-zA-Z0-9_\-]{20,}$/;
    return apiKeyRegex.test(apiKey);
}

export function validateSymbol(symbol: string): boolean {
    const symbolRegex = /^[A-Z]{1,5}$/;
    return symbolRegex.test(symbol.toUpperCase());
}

export function validatePagination(page: number, limit: number): { valid: boolean; error?: string } {
    if (page < 1) {
        return { valid: false, error: 'ページ番号は1以上でなければなりません' };
    }

    if (limit < 1 || limit > 100) {
        return { valid: false, error: 'リミットは1〜100の間でなければなりません' };
    }

    return { valid: true };
}
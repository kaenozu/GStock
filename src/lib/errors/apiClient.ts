/**
 * API Client with Error Handling and Toast Notifications
 * Phase 20A: Error Logging Enhancement
 */

import { toast } from 'sonner';
import { ErrorLogger } from './ErrorLogger';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface ApiOptions {
  /** Show toast on error (default: true) */
  showToast?: boolean;
  /** Custom error message for toast */
  errorMessage?: string;
  /** Context for logging */
  context?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Wrapper for fetch with error handling, logging, and toast notifications
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit & ApiOptions
): Promise<ApiResponse<T>> {
  const {
    showToast = true,
    errorMessage,
    context = 'API',
    timeout = 30000,
    ...fetchOptions
  } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData: { error?: string } = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON
      }

      const message = errorData.error || errorText || `HTTP ${response.status}`;
      
      ErrorLogger.error(message, context, {
        url,
        status: response.status,
        method: fetchOptions?.method || 'GET',
      });

      if (showToast) {
        toast.error(errorMessage || 'リクエストに失敗しました', {
          description: message,
        });
      }

      return {
        data: null,
        error: message,
        status: response.status,
      };
    }

    const data = await response.json();
    
    // Check for error in response body
    if (data.error) {
      ErrorLogger.warn(data.error, context, { url });
      
      if (showToast) {
        toast.warning('警告', { description: data.error });
      }
    }

    return {
      data,
      error: data.error || null,
      status: response.status,
    };

  } catch (error) {
    clearTimeout(timeoutId);

    const isAbort = error instanceof Error && error.name === 'AbortError';
    const message = isAbort
      ? 'リクエストがタイムアウトしました'
      : error instanceof Error
        ? error.message
        : 'ネットワークエラー';

    ErrorLogger.error(message, context, {
      url,
      method: fetchOptions?.method || 'GET',
      isTimeout: isAbort,
    });

    if (showToast) {
      toast.error(errorMessage || (isAbort ? 'タイムアウト' : '通信エラー'), {
        description: message,
      });
    }

    return {
      data: null,
      error: message,
      status: 0,
    };
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(
  url: string,
  options?: ApiOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, { method: 'GET', ...options });
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options?: ApiOptions
): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    ...options,
  });
}

const apiClient = { apiFetch, apiGet, apiPost };
export default apiClient;

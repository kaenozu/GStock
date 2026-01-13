'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary - Global error handler for React components
 * Catches errors and displays fallback UI
 * Logs errors to server via /api/errors
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log to server
        fetch('/api/errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'ERROR',
                message: `ErrorBoundary caught error in ${this.props.name || 'Component'}: ${error.message}`,
                context: this.props.name || 'Component',
                stack: error.stack || errorInfo.componentStack,
            }),
        }).catch(() => {
            // Fallback to console if API fails
            console.error('[ErrorBoundary]', error, errorInfo);
        });
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50 flex flex-col items-center justify-center text-center gap-4 m-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <TriangleAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                            Something went wrong
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1 max-w-md">
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

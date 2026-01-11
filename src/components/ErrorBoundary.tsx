'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import styles from './GlobalErrorBoundary.module.css';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[GlobalErrorBoundary] Error caught:', error);
        console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack);

        this.setState({ error });

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        this.logErrorToService(error, errorInfo);
    }

    async logErrorToService(error: Error, errorInfo: ErrorInfo) {
        try {
            await fetch('/api/errors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                }),
            });
        } catch (loggingError) {
            console.error('[GlobalErrorBoundary] Failed to log error:', loggingError);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={styles.container}>
                    <div className={styles.errorCard}>
                        <div className={styles.icon}>
                            <svg
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M12 9V2M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 13C12.55 13 13 13.45 13 14C13 14.55 12.55 15 12 15C11.45 15 11 14.55 11 14C11 13.45 11.45 13 12 13ZM11 11H13V13H11V11Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <h1 className={styles.title}>
                            エラーが発生しました
                        </h1>

                        <p className={styles.message}>
                            申し訳ありませんが、予期しないエラーが発生しました。
                            <br />
                            もう一度お試しいただくか、ページを再読み込みしてください。
                        </p>

                        {process.env.NODE_ENV === 'development' && (
                            <details className={styles.details}>
                                <summary className={styles.summary}>
                                    開発者用の詳細情報
                                </summary>
                                <div className={styles.detailContent}>
                                    <h3 className={styles.detailTitle}>エラーメッセージ</h3>
                                    <pre className={styles.code}>
                                        {this.state.error?.message}
                                    </pre>

                                    {this.state.error?.stack && (
                                        <>
                                            <h3 className={styles.detailTitle}>スタックトレース</h3>
                                            <pre className={styles.code}>
                                                {this.state.error.stack}
                                            </pre>
                                        </>
                                    )}
                                </div>
                            </details>
                        )}

                        <button
                            onClick={this.handleReset}
                            className={styles.resetButton}
                        >
                            アプリケーションをリセット
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
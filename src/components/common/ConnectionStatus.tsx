/**
 * ConnectionStatus Component
 * @description WebSocket接続状態の表示
 * @module components/common/ConnectionStatus
 */

'use client';

import React from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { ConnectionStatus as Status } from '@/lib/websocket';

interface ConnectionStatusProps {
    /** 接続状態 */
    status: Status;
    /** エラーメッセージ */
    error?: string | null;
    /** コンパクト表示 */
    compact?: boolean;
}

/** ステータスごとの設定 */
const STATUS_CONFIG: Record<Status, { color: string; label: string; Icon: React.ElementType }> = {
    connected: {
        color: '#10b981',
        label: 'リアルタイム',
        Icon: Wifi,
    },
    connecting: {
        color: '#f59e0b',
        label: '接続中...',
        Icon: Loader2,
    },
    disconnected: {
        color: '#64748b',
        label: 'オフライン',
        Icon: WifiOff,
    },
    error: {
        color: '#ef4444',
        label: 'エラー',
        Icon: AlertCircle,
    },
};

/**
 * 接続状態インジケーター
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusProps> = ({
    status,
    error,
    compact = false,
}) => {
    const config = STATUS_CONFIG[status];
    const { color, label, Icon } = config;
    const isSpinning = status === 'connecting';

    if (compact) {
        return (
            <div
                title={error || label}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${color}20`,
                    border: `1px solid ${color}40`,
                }}
                role="status"
                aria-label={`WebSocket接続状態: ${label}`}
            >
                <Icon
                    size={12}
                    color={color}
                    style={isSpinning ? { animation: 'spin 1s linear infinite' } : undefined}
                    aria-hidden="true"
                />
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: `${color}15`,
                border: `1px solid ${color}40`,
                fontSize: '0.75rem',
                color: color,
            }}
            role="status"
            aria-label={`WebSocket接続状態: ${label}`}
        >
            <Icon
                size={14}
                style={isSpinning ? { animation: 'spin 1s linear infinite' } : undefined}
                aria-hidden="true"
            />
            <span>{label}</span>
            {error && (
                <span
                    style={{
                        fontSize: '0.65rem',
                        opacity: 0.8,
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={error}
                >
                    ({error})
                </span>
            )}
        </div>
    );
};

export default ConnectionStatusIndicator;

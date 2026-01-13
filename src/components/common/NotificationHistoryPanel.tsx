import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Settings, Clock } from 'lucide-react';
import styles from './NotificationHistoryPanel.module.css';

interface NotificationHistory {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
}

export function NotificationHistoryPanel() {
    const [history, setHistory] = useState<NotificationHistory[]>([]);
    const [enabled, setEnabled] = useState(true);
    const [minConfidence, setMinConfidence] = useState(70);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const notifications = JSON.parse(
                    localStorage.getItem('notificationHistory') || '[]'
                );
                setHistory(notifications);
            } catch (error) {
                console.error('[NotificationHistory] Failed to load history:', error);
            }
        };

        const loadSettings = () => {
            try {
                const settings = JSON.parse(
                    localStorage.getItem('notificationSettings') || '{}'
                );
                setEnabled(settings.enabled ?? true);
                setMinConfidence(settings.minConfidence ?? 70);
            } catch (error) {
                console.error('[NotificationHistory] Failed to load settings:', error);
            }
        };

        loadHistory();
        loadSettings();
    }, []);

    const saveSettings = () => {
        try {
            localStorage.setItem(
                'notificationSettings',
                JSON.stringify({ enabled, minConfidence })
            );
        } catch (error) {
            console.error('[NotificationHistory] Failed to save settings:', error);
        }
    };

    const markAsRead = (id: string) => {
        const updatedHistory = history.map((item) =>
            item.id === id ? { ...item, read: true } : item
        );
        setHistory(updatedHistory);
        localStorage.setItem(
            'notificationHistory',
            JSON.stringify(updatedHistory)
        );
    };

    const clearHistory = () => {
        if (confirm('通知履歴をクリアしますか？')) {
            setHistory([]);
            localStorage.removeItem('notificationHistory');
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'たった今';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
        return date.toLocaleDateString('ja-JP');
    };

    const unreadCount = history.filter((item) => !item.read).length;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <Bell size={20} />
                    プッシュ通知
                    {unreadCount > 0 && (
                        <span className={styles.badge}>{unreadCount}</span>
                    )}
                </h2>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>通知設定</h3>
                    <div className={styles.settings}>
                        <div className={styles.setting}>
                            <label className={styles.switchLabel}>
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => {
                                        setEnabled(e.target.checked);
                                        saveSettings();
                                    }}
                                    className={styles.switch}
                                />
                                <span className={styles.switchText}>
                                    {enabled ? '有効' : '無効'}
                                </span>
                            </label>
                        </div>

                        <div className={styles.setting}>
                            <label className={styles.rangeLabel}>
                                <span className={styles.rangeLabel}>
                                    最小信頼度: {minConfidence}%
                                </span>
                                <input
                                    type="range"
                                    min="50"
                                    max="100"
                                    value={minConfidence}
                                    onChange={(e) => {
                                        setMinConfidence(Number(e.target.value));
                                        saveSettings();
                                    }}
                                    className={styles.range}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>通知履歴</h3>
                        {history.length > 0 && (
                            <button
                                onClick={clearHistory}
                                className={styles.clearButton}
                            >
                                クリア
                            </button>
                        )}
                    </div>

                    <div className={styles.historyList}>
                        {history.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Clock size={48} />
                                <p>通知履歴はありません</p>
                            </div>
                        ) : (
                            history.map((item) => (
                                <div
                                    key={item.id}
                                    className={`${styles.historyItem} ${
                                        item.read ? styles.read : styles.unread
                                    }`}
                                    onClick={() => markAsRead(item.id)}
                                >
                                    <div className={styles.historyItemContent}>
                                        <div className={styles.historyItemHeader}>
                                            <h4 className={styles.historyItemTitle}>
                                                {item.title}
                                            </h4>
                                            {!item.read && (
                                                <span className={styles.unreadIndicator}>
                                                    <Check size={12} />
                                                </span>
                                            )}
                                        </div>
                                        <p className={styles.historyItemBody}>
                                            {item.body}
                                        </p>
                                        <span className={styles.historyItemTime}>
                                            {formatTime(item.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
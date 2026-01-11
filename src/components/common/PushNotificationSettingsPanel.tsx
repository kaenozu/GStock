import React from 'react';
import { usePushNotification } from '@/hooks/usePushNotification';
import styles from './PushNotificationSettingsPanel.module.css';

interface PushNotificationSettingsPanelProps {
    onClose?: () => void;
}

export function PushNotificationSettingsPanel({ onClose }: PushNotificationSettingsPanelProps) {
    const { token, isSupported, permission, requestPermission, subscribe, unsubscribe } = usePushNotification();
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubscribe = async () => {
        setLoading(true);
        setError(null);
        try {
            if (permission !== 'granted') {
                const granted = await requestPermission();
                if (!granted) {
                    setError('通知許可が必要です');
                    setLoading(false);
                    return;
                }
            }
            await subscribe();
        } catch (e) {
            setError('購読に失敗しました');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        setLoading(true);
        setError(null);
        try {
            await unsubscribe();
        } catch (e) {
            setError('解除に失敗しました');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isSupported) {
        return (
            <div className={styles.container}>
                <h2 className={styles.title}>プッシュ通知設定</h2>
                <p className={styles.message}>
                    お使いのブラウザはプッシュ通知をサポートしていません。
                </p>
                {onClose && (
                    <button onClick={onClose} className={styles.closeButton}>
                        閉じる
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>プッシュ通知設定</h2>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <div className={styles.status}>
                <span className={styles.label}>現在の状態：</span>
                <span className={`${styles.statusValue} ${token ? styles.subscribed : styles.notSubscribed}`}>
                    {token ? '購読中' : '未購読'}
                </span>
            </div>

            {permission !== 'granted' && (
                <div className={styles.warning}>
                    <span className={styles.label}>通知許可：</span>
                    <span className={styles.permissionStatus}>{permission}</span>
                </div>
            )}

            {token ? (
                <div className={styles.actions}>
                    <div className={styles.tokenInfo}>
                        <div className={styles.tokenLabel}>トークン：</div>
                        <code className={styles.token}>{token.substring(0, 20)}...</code>
                    </div>
                    <button
                        onClick={handleUnsubscribe}
                        disabled={loading}
                        className={`${styles.button} ${styles.unsubscribe}`}
                    >
                        {loading ? '解除中...' : '購読解除'}
                    </button>
                </div>
            ) : (
                <div className={styles.actions}>
                    <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className={`${styles.button} ${styles.subscribe}`}
                    >
                        {loading ? '購読中...' : 'プッシュ通知を有効にする'}
                    </button>
                </div>
            )}

            {onClose && (
                <button onClick={onClose} className={styles.closeButton}>
                    閉じる
                </button>
            )}
        </div>
    );
}
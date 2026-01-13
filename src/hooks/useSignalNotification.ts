import { useEffect, useCallback } from 'react';
import { AnalysisResult } from '@/types/market';

interface UseSignalNotificationProps {
    enabled?: boolean;
    onNotification?: (signal: AnalysisResult) => void;
}

export function useSignalNotification({ enabled = true, onNotification }: UseSignalNotificationProps) {
    const sendPushNotification = useCallback(async (signal: AnalysisResult) => {
        try {
            const title = `シグナル: ${signal.symbol || 'GStock'}`;
            const body = `${signal.sentiment} (${signal.confidence}%) - レジーム: ${signal.marketRegime}`;

            const response = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    body,
                    tag: `signal-${signal.symbol}`,
                    requireInteraction: true,
                }),
            });

            if (response.ok) {
                console.log('[SignalNotification] Push notification sent successfully');
            }
        } catch (error) {
            console.error('[SignalNotification] Failed to send push notification:', error);
        }
    }, []);

    const notify = useCallback((signal: AnalysisResult) => {
        if (!enabled) return;

        // Check if confidence is strong enough (> 70%)
        if (signal.confidence < 70) return;

        // Check if there are any signals
        if (!signal.signals || signal.signals.length === 0) return;

        // Send push notification
        sendPushNotification(signal);

        // Call callback if provided
        if (onNotification) {
            onNotification(signal);
        }
    }, [enabled, sendPushNotification, onNotification]);

    return {
        notify,
        sendPushNotification,
    };
}
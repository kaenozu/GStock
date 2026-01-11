import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { messaging } from '@/lib/firebase/firebase-config';

interface PushNotificationHookResult {
    token: string | null;
    isSupported: boolean;
    permission: NotificationPermission;
    requestPermission: () => Promise<boolean>;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

export function usePushNotification(): PushNotificationHookResult {
    const [token, setToken] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        const checkSupport = () => {
            setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
            setPermission(Notification.permission);
        };

        checkSupport();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js').then(() => {
                console.log('[PushNotification] Service Worker registered');
            }).catch((error) => {
                console.error('[PushNotification] Service Worker registration failed:', error);
            });
        }
    }, []);

    const requestPermission = async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('[PushNotification] Push notifications not supported');
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        } catch (error) {
            console.error('[PushNotification] Failed to request permission:', error);
            return false;
        }
    };

    const subscribe = async (): Promise<void> => {
        if (!isSupported) {
            throw new Error('Push notifications not supported');
        }

        if (permission !== 'granted') {
            const granted = await requestPermission();
            if (!granted) {
                throw new Error('Permission denied');
            }
        }

        try {
            const messagingInstance = messaging();
            if (!messagingInstance) {
                throw new Error('Firebase Messaging not initialized');
            }

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                throw new Error('VAPID public key not configured');
            }

            const currentToken = await getToken(messagingInstance, {
                vapidKey: vapidPublicKey,
            });

            if (currentToken) {
                setToken(currentToken);
                console.log('[PushNotification] Successfully subscribed:', currentToken);
                
                // Send token to server for storage
                await fetch('/api/push/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: currentToken }),
                });
            } else {
                console.warn('[PushNotification] No registration token available');
            }
        } catch (error) {
            console.error('[PushNotification] Failed to subscribe:', error);
            throw error;
        }
    };

    const unsubscribe = async (): Promise<void> => {
        if (token) {
            try {
                await fetch('/api/push/unregister', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                setToken(null);
                console.log('[PushNotification] Successfully unsubscribed');
            } catch (error) {
                console.error('[PushNotification] Failed to unsubscribe:', error);
                throw error;
            }
        }
    };

    useEffect(() => {
        if (isSupported && token) {
            const messagingInstance = messaging();
            if (messagingInstance) {
                const unsubscribeMessage = onMessage(messagingInstance, (payload) => {
                    console.log('[PushNotification] Foreground message:', payload);
                    if (payload.notification) {
                        new Notification(payload.notification.title || 'GStock', {
                            body: payload.notification.body,
                            icon: payload.notification.icon || '/vercel.svg',
                        });
                    }
                });

                return () => {
                    unsubscribeMessage();
                };
            }
        }
    }, [isSupported, token]);

    return {
        token,
        isSupported,
        permission,
        requestPermission,
        subscribe,
        unsubscribe,
    };
}
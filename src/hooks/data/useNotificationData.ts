import { useApiQuery } from '@/hooks/useApiQuery';

interface NotificationData {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
}

export function useNotificationData() {
    return useApiQuery<NotificationData[]>(
        ['notifications'],
        () => fetch('/api/notifications').then(res => res.json()),
        {
            staleTime: 60000, // 10 minutes
        }
    );
}

export function useNotificationDataLazy() {
    return useApiQuery<NotificationData[]>(
        ['notifications'],
        () => fetch('/api/notifications').then(res => res.json()),
        {
            enabled: false, // Initially disabled
        }
    );
}
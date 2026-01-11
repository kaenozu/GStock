let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return false;
    }

    try {
        swRegistration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        console.log('[SW] Service Worker registered:', swRegistration.scope);

        swRegistration.addEventListener('updatefound', () => {
            const newWorker = swRegistration?.installing;
            if (newWorker) {
                console.log('[SW] New service worker installing');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[SW] New content available, refreshing...');
                        window.location.reload();
                    }
                });
            }
        });

        return true;
    } catch (error) {
        console.error('[SW] Failed to register service worker:', error);
        return false;
    }
}

export async function skipWaiting() {
    if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
}

export async function clearCache() {
    const activeSW = swRegistration?.active;
    if (activeSW) {
        activeSW.postMessage({ type: 'CLEAR_CACHE' });
        console.log('[SW] Cache cleared');
    }
}

export async function getCacheStats() {
    const activeSW = swRegistration?.active;
    if (!activeSW) {
        return null;
    }

    return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
            resolve(event.data);
        };
        
        activeSW.postMessage(
            { type: 'GET_CACHE_STATS' },
            [messageChannel.port2]
        );
    });
}

export function isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

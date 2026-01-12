import { messaging } from './firebase-config';

const CACHE_NAME = 'gstock-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/']);
        })
    );
    self.skipWaiting();
    console.log('[SW] Service Worker installed');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('gstock-')) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
    console.log('[SW] Service Worker activated');
});

self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body || '',
                icon: '/vercel.svg',
                badge: '/vercel.svg',
                tag: data.tag || 'gstock-notification',
                requireInteraction: data.requireInteraction || false,
                actions: data.actions || [],
            };

            event.waitUntil(
                self.registration.showNotification(data.title || 'GStock', options)
            );
        } catch (error) {
            console.error('[SW] Failed to parse push data:', error);
            event.waitUntil(
                self.registration.showNotification('GStock', {
                    body: 'プッシュ通知を受信しました',
                    icon: '/vercel.svg',
                    badge: '/vercel.svg',
                })
            );
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

self.addEventListener('message', (event) => {
    const { type } = event.data;

    if (type === 'PERIODIC_CHECK') {
        performHealthCheck();
    } else if (type === 'GET_CACHE_STATS') {
        getCacheStats(event.ports[0]);
    } else if (type === 'CLEAR_CACHE') {
        clearCache();
    }
});

let checkInterval = null;

function startPeriodicCheck() {
    if (checkInterval) {
        clearInterval(checkInterval);
    }

    checkInterval = setInterval(() => {
        performHealthCheck();
    }, 5 * 60 * 1000);

    console.log('[SW] Periodic health check started (every 5 minutes)');
}

async function performHealthCheck() {
    try {
        const response = await fetch('/api/health');
        
        if (response.ok) {
            const data = await response.json();
            console.log('[SW] Health check passed:', data);

            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    if (client.state === 'activated') {
                        client.postMessage({
                            type: 'HEALTH_STATUS',
                            data: data
                        });
                    }
                });
            });
        }
    } catch (error) {
        console.error('[SW] Health check failed:', error);
    }
}

async function getCacheStats(port) {
    try {
        const cacheNames = await caches.keys();
        const stats = [];

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            let totalSize = 0;

            for (const request of keys) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }

            stats.push({
                name: cacheName,
                count: keys.length,
                size: totalSize
            });
        }

        port.postMessage(stats);
    } catch (error) {
        console.error('[SW] Failed to get cache stats:', error);
        port.postMessage([]);
    }
}

async function clearCache() {
    try {
        const cacheNames = await caches.keys();

        for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
        }

        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Failed to clear cache:', error);
    }
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event.request));
    } else {
        event.respondWith(handleStaticRequest(event.request));
    }
});

async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        const responseToCache = response.clone();

        const cache = await caches.open(`${CACHE_NAME}-api`);
        cache.put(request.url, responseToCache);

        return response;
    } catch (error) {
        const cached = await caches.match(request);
        
        if (cached) {
            const headers = new Headers(cached.headers);
            headers.set('X-Cache', 'HIT');
            headers.set('X-From-Cache', 'true');

            return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers
            });
        }
        
        return new Response(JSON.stringify({
            error: 'Network request failed and no cached data available',
            offline: true
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        });
    }
}

async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        const cachedDate = cached.headers.get('date');
        const cachedTime = cachedDate ? new Date(cachedDate).getTime() : 0;
        const now = Date.now();

        if (now - cachedTime < 24 * 60 * 60 * 1000) {
            return cached;
        }
    }

    try {
        const response = await fetch(request);
        const responseToCache = response.clone();

        if (response.ok) {
            cache.put(request, responseToCache);
            return response;
        }

        return cached;
    } catch (error) {
        return cached;
    }
}
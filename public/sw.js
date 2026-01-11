const CACHE_NAME = 'gstock-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
];

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(event.request));
    } else {
        event.respondWith(handleStaticRequest(event.request));
    }
});

async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        const cachedDate = cachedResponse.headers.get('date');
        const cachedTime = cachedDate ? new Date(cachedDate).getTime() : 0;
        const now = Date.now();

        if (now - cachedTime < CACHE_DURATION) {
            return cachedResponse;
        }
    }

    try {
        const networkResponse = await fetch(request);
        const responseToCache = networkResponse.clone();
        
        if (networkResponse.ok) {
            cache.put(request, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response('Offline - No cached content available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

async function handleApiRequest(request) {
    const cache = await caches.open(`${CACHE_NAME}-api`);
    const cacheKey = request.url;
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            cache.put(cacheKey, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(cacheKey);
        
        if (cachedResponse) {
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-Cache', 'HIT');
            headers.set('X-From-Cache', 'true');
            
            return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
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

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        });
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATS') {
        caches.keys().then(async (cacheNames) => {
            const stats = [];
            
            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                const size = await calculateCacheSize(cache);
                
                stats.push({
                    name: cacheName,
                    count: keys.length,
                    size: size
                });
            }
            
            event.ports[0].postMessage(stats);
        });
    }
});

async function calculateCacheSize(cache) {
    const keys = await cache.keys();
    let totalSize = 0;
    
    for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }
    
    return totalSize;
}

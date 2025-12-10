
const CACHE_NAME = 'exportium-v3-offline-capable';

// We explicitly cache the CDN assets we know we need.
// Note: Dynamic imports (like React from the importmap) are handled by the runtime caching in the fetch event below.
const PRE_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Installing dependencies for offline access...');
      // We use addAll. If one fails, the whole install fails, ensuring consistency.
      return cache.addAll(PRE_CACHE_URLS);
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Cache Hit: Return immediately (Fastest & Offline support)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Cache Miss: Fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Check if valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
            return networkResponse;
        }

        // Cache the new resource (Dynamic Caching)
        // This captures the React/ReactDOM files from the CDN as they load
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((error) => {
         // 3. Network Fail (Offline):
         // If we are navigating to a page (like /app/instagram) and it's not in cache,
         // serve index.html to let React Router handle the view.
         if (event.request.mode === 'navigate') {
             return caches.match('/index.html');
         }
         // Optional: Return a placeholder image for missing images
         return null;
      });
    })
  );
});

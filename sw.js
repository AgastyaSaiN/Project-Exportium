
const CACHE_NAME = 'exportium-v6-offline-trust';

// Files strictly required for the app shell to render
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  // Tailwind is critical for layout
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Installing... Caching App Shell');
      // We use addAll for local files. If any fail, install fails.
      await cache.addAll(APP_SHELL);
    })
  );
  // Force this SW to become the active service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Cleaning old cache:', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

self.addEventListener('fetch', (event) => {
  // 1. NAVIGATION REQUESTS (HTML)
  // This is the key fix for "Cannot reach site" when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('[SW] Offline navigation. Serving index.html');
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 2. ASSET REQUESTS (JS, CSS, Images, Fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache valid responses for next time (Dynamic Caching)
        // We cache opaque responses (status 0) for things like Google Fonts/Icons
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
                cache.put(event.request, responseToCache);
            } catch (e) {
                // Ignore quota errors or invalid schemes
            }
          });
        }
        return networkResponse;
      });
    })
  );
});

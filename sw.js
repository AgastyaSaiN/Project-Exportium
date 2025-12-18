
const CACHE_NAME = 'exportium-v1.0.0-gold';

// 1. CRITICAL ASSETS: These MUST be cached for the app to boot.
// If any of these fail to cache, the Service Worker installation fails.
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  // We include the CSS CDN here because without it, the app looks broken.
  'https://cdn.tailwindcss.com'
];

// 2. OPTIONAL ASSETS: These are good to have, but if they fail (e.g. CORS, offline), 
// we shouldn't kill the entire app installation.
const OPTIONAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn-icons-png.flaticon.com/512/4128/4128047.png'
];

// Install Event: Cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('SW: Caching critical assets...');
      
      // Critical: Fail hard if these don't load
      await cache.addAll(CRITICAL_ASSETS);

      // Optional: Try to load, but don't crash if they fail
      console.log('SW: Caching optional assets...');
      try {
        await cache.addAll(OPTIONAL_ASSETS);
      } catch (err) {
        console.warn('SW: Some optional assets failed to cache', err);
      }
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: The Core Logic
self.addEventListener('fetch', (event) => {
  // We only care about GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    (async () => {
      // 1. Try Cache First (Fastest & Offline Friendly)
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Network Fallback
      try {
        const networkResponse = await fetch(event.request);
        
        // Dynamic Caching: If we successfully fetched something valid, cache it for next time.
        // This handles all the React chunks and dynamic imports automatically.
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'error') {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseToCache);
           });
        }
        return networkResponse;

      } catch (error) {
        // 3. OFFLINE FALLBACK LOGIC
        // This is the specific fix for "Cannot reach site".
        // If the request was for a page navigation (mode: 'navigate') 
        // OR it accepts HTML headers, we return the App Shell (index.html).
        
        if (event.request.mode === 'navigate' || 
            (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
          console.log('SW: Network failed. Serving offline App Shell.');
          return caches.match('/index.html');
        }

        // For missing images/assets, we could return a placeholder here if we wanted.
        // For now, let them fail naturally.
        console.log('SW: Network request failed', event.request.url);
        return null; // Or return new Response('Offline', { status: 503 })
      }
    })()
  );
});

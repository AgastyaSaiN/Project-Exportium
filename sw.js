
const CACHE_NAME = 'exportium-v10-offline-robust';

// 1. APP SHELL: The minimal files needed to boot the app.
// We explicitly cache '/' and '/index.html' to ensure the entry point works.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx'
];

// 2. EXTERNAL DEPENDENCIES: Must match index.html importmap EXACTLY.
// Any mismatch (e.g., missing trailing slash) will cause the cache to fail.
const EXTERNAL_DEPS = [
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/react-router-dom@^7.8.2',
  'https://aistudiocdn.com/jszip@^3.10.1',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Installing... Caching App Shell');
      
      // Strategy: Fetch index.html once, but save it under multiple aliases ('/' and '/index.html')
      // This ensures that however the browser requests the root, we have a match.
      try {
        const indexResponse = await fetch('/index.html');
        if (indexResponse.ok) {
            await cache.put('/index.html', indexResponse.clone());
            await cache.put('/', indexResponse.clone());
        }
      } catch (e) {
          console.error('[SW] Failed to cache index.html during install', e);
      }
      
      // Cache other local source files
      await cache.addAll(APP_SHELL.filter(url => url !== '/' && url !== '/index.html'));

      // Cache external CDNs
      // We process them individually so one failure doesn't kill the whole install,
      // though these are critical for the app to look right.
      const externalPromises = EXTERNAL_DEPS.map(url => {
        const request = new Request(url, { mode: 'cors' });
        return fetch(request).then(response => {
          if (!response.ok) throw new Error(`Status ${response.status}`);
          return cache.put(request, response);
        }).catch(e => console.warn(`[SW] Failed to cache ${url}`, e));
      });

      await Promise.all(externalPromises);
    })
  );
  // Force this SW to become active immediately (don't wait for tabs to close)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        // Delete old caches to ensure users get the latest version
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

self.addEventListener('fetch', (event) => {
  // 1. NAVIGATION FALLBACK (The fix for "You're offline")
  // If the browser requests a page navigation (mode: navigate) and fails,
  // we return the cached index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html')
          .then(resp => resp || caches.match('/'))
          .then(resp => {
             if(resp) return resp;
             throw new Error('Offline and index.html not found in cache.');
          });
      })
    );
    return;
  }

  // 2. STALE-WHILE-REVALIDATE for everything else (scripts, images)
  // Serve from cache immediately, then update from network in background.
  event.respondWith(
    caches.match(event.request).then(cachedResp => {
      const networkFetch = fetch(event.request).then(netResp => {
        // If network works, update the cache for next time
        if (netResp && netResp.status === 200) {
          const respClone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        }
        return netResp;
      }).catch(() => {
          // Network failed, rely solely on cache
      });
      
      // Return cache if available, otherwise wait for network
      return cachedResp || networkFetch;
    })
  );
});

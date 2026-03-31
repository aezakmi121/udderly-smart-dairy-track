// OneSignal SDK - must be first
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// PWA caching logic (merged here so there is only ONE service worker at root scope)
const ASSETS_CACHE = 'assets-cache-v1';
const PAGES_CACHE = 'pages-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [ASSETS_CACHE, PAGES_CACHE];
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (!cacheWhitelist.includes(name)) return caches.delete(name);
          })
        )
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (let OneSignal handle its own)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Cache-first for built assets
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              cache.put(request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Network-first for navigation
  if (request.mode === 'navigate' || !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.status === 200) {
            caches.open(PAGES_CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});

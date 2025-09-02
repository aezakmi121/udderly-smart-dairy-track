// Service Worker for PWA functionality with Vite-compatible caching
const CACHE_NAME = 'dairy-farm-manager-v1';

// Cache strategies
const ASSETS_CACHE = 'assets-cache-v1';
const PAGES_CACHE = 'pages-cache-v1';

// Handle notification display
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  event.notification.close();

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Install event - simplified, no pre-caching
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Fetch event with strategic caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first strategy for Vite assets (built files)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(fetchResponse => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Network-first strategy for navigation and API requests
  if (request.method === 'GET' && (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.includes('.')  === false
  )) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(PAGES_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // For other requests, just fetch normally
  event.respondWith(fetch(request));
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  const cacheWhitelist = [ASSETS_CACHE, PAGES_CACHE];
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// TODO: For production apps, consider using Workbox or vite-plugin-pwa
// for more sophisticated caching strategies and automatic asset management
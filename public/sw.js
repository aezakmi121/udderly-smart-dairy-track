// Service Worker: PWA caching + Web Push handlers

const ASSETS_CACHE = 'assets-cache-v2';
const PAGES_CACHE = 'pages-cache-v2';

self.addEventListener('install', (event) => {
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

// ---------- Web Push ----------
self.addEventListener('push', (event) => {
  let payload = { title: 'Notification', body: '', data: {} };
  try {
    if (event.data) {
      const text = event.data.text();
      try {
        payload = { ...payload, ...JSON.parse(text) };
      } catch {
        payload.body = text;
      }
    }
  } catch (e) {
    console.error('[sw] push parse error', e);
  }

  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || '',
    icon: '/favicon-32x32.png',
    badge: '/favicon-32x32.png',
    data: payload.data || {},
    tag: payload.data?.tag || undefined,
    renotify: !!payload.data?.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate?.(url);
          return w.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ---------- Cache strategies ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

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

  if (request.mode === 'navigate' || !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});

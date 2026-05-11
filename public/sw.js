// Service Worker: PWA caching + Web Push handlers + diagnostics beacons

const ASSETS_CACHE = 'assets-cache-v3';
const PAGES_CACHE = 'pages-cache-v3';

// Replaced at runtime via SW_API_BASE message — fall back to relative path otherwise.
let API_BASE = '';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  const whitelist = [ASSETS_CACHE, PAGES_CACHE];
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((names) => Promise.all(
      names.map((n) => !whitelist.includes(n) && caches.delete(n))
    )),
  ]));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SET_API_BASE' && typeof e.data.base === 'string') {
    API_BASE = e.data.base;
  }
});

function resolveApiBase(payload) {
  const candidate = payload?.data?.apiBase;
  if (!API_BASE && typeof candidate === 'string') API_BASE = candidate;
  return API_BASE;
}

async function getEndpoint() {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    return sub ? sub.endpoint : null;
  } catch { return null; }
}

async function logEvent(event_type, payload_tag, meta) {
  if (!API_BASE) return;
  try {
    const endpoint = await getEndpoint();
    await fetch(`${API_BASE}/log-notification-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type, payload_tag, endpoint, meta }),
      keepalive: true,
    });
  } catch {}
}

// ---------- Web Push ----------
self.addEventListener('push', (event) => {
  let payload = { title: 'Notification', body: '', data: {} };
  try {
    if (event.data) {
      const text = event.data.text();
      try { payload = { ...payload, ...JSON.parse(text) }; }
      catch { payload.body = text; }
    }
  } catch (e) { console.error('[sw] push parse error', e); }

  const tag = payload.data?.tag;
  resolveApiBase(payload);

  // Health pings: log + show a tiny silent-ish notif to satisfy userVisibleOnly,
  // immediately closed.
  if (payload.data?.type === 'health_ping') {
    event.waitUntil((async () => {
      await logEvent('sw_received', tag, { type: 'health_ping' });
      // Required by browsers — show then close fast
      try {
        await self.registration.showNotification('🔧', { tag: 'health_ping', silent: true, body: '' });
        const ns = await self.registration.getNotifications({ tag: 'health_ping' });
        ns.forEach((n) => n.close());
      } catch {}
    })());
    return;
  }

  const title = payload.title || 'Notification';
  const options = {
    body: payload.body || '',
    icon: '/favicon-32x32.png',
    badge: '/favicon-32x32.png',
    data: payload.data || {},
    tag: tag || undefined,
    renotify: false, // important: do NOT re-vibrate when same tag arrives
  };

  event.waitUntil((async () => {
    await logEvent('sw_received', tag, { title, sentAt: payload.data?.sentAt || null, receivedAt: new Date().toISOString() });
    await self.registration.showNotification(title, options);
    await logEvent('sw_displayed', tag, { sentAt: payload.data?.sentAt || null, displayedAt: new Date().toISOString() });
  })());
});

self.addEventListener('notificationclick', (event) => {
  const tag = event.notification.tag;
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    await logEvent('sw_clicked', tag, { url, clickedAt: new Date().toISOString() });
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        w.navigate?.(url);
        return w.focus();
      }
    }
    return clients.openWindow(url);
  })());
});

// ---------- Cache strategies ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) =>
        cache.match(request).then((cached) =>
          cached || fetch(request).then((res) => { cache.put(request, res.clone()); return res; })
        )
      )
    );
    return;
  }

  if (request.mode === 'navigate' || !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(PAGES_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request))
    );
  }
});

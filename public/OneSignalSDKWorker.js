// Kill-switch: this file used to host the OneSignal service worker.
// We've migrated to native Web Push (/sw.js). This stub unregisters itself
// so old installs don't keep importing OneSignal scripts.
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await self.clients.claim();
  try {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  } catch {}
  await self.registration.unregister();
})()));

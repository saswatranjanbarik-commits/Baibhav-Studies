/*
 * Service worker for Dugu EduTrack (v1.3).
 *
 * 1. NOTIFICATIONS — shows study reminders and opens the app when tapped.
 * 2. OFFLINE — lets the app open without internet:
 *    - Pages: NETWORK FIRST. Online you always get the latest version; the
 *      saved copy is only used when there's no connection.
 *    - /assets/* (Vite build files with a unique hash in the name, so they
 *      never change): served from the saved copy if present.
 *    - Icons/manifest: saved copy, refreshed in the background.
 *    - Firebase / Google requests are NOT touched (the app handles those).
 *
 * To force every device to drop old saved copies, bump CACHE_VERSION.
 */
const CACHE_VERSION = 'v1.3';
const CACHE = `edutrack-${CACHE_VERSION}`;
const MAX_ASSETS = 80;

self.addEventListener('install', (event) => {
  // Save the app shell straight away so the very first offline open works.
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png']))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('edutrack-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trimAssets(cache) {
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith('/assets/'));
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Firebase/Google calls

  // Pages (any app route): network first, fall back to the saved app shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/', copy));
          }
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  // Hashed build files: saved copy first (they never change).
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).then(() => trimAssets(c)));
        }
        return res;
      })),
    );
    return;
  }

  // Icons, manifest, favicon: saved copy, refreshed in the background.
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest' || url.pathname === '/favicon.png') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || network;
      }),
    );
  }
  // Everything else: normal network behaviour.
});

// ---- Notifications --------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

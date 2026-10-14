/*
 * Minimal service worker for Dugu EduTrack.
 *
 * Its ONLY job is to let the browser show study-reminder notifications
 * (Android/Chrome require a service worker for this) and to open the app
 * when a notification is tapped.
 *
 * It deliberately has NO fetch handler and does NO caching, so it can never
 * serve an out-of-date version of the app.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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

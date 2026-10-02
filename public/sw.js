/* Push-only worker: private pages and documents are never cached. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Show a useful fallback. */ }
  event.waitUntil(self.registration.showNotification(
    typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'Keeply reminder',
    { body: typeof payload.body === 'string' ? payload.body.slice(0, 240) : 'Open Keeply to review your reminders.',
      icon: '/brand/icon-192.png', badge: '/brand/icon-192.png',
      tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 100) : 'keeply-reminder',
      data: { url: payload.url }, renotify: false }
  ));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let url;
  try {
    url = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
    if (url.origin !== self.location.origin || !/^\/(items\/[0-9a-f-]{36}|settings\/alerts|dashboard)$/.test(url.pathname)) url = new URL('/dashboard', self.location.origin);
  } catch { url = new URL('/dashboard', self.location.origin); }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      // Reuse the matching page; leave other tabs' unfinished forms intact.
      if (client.url === url.href && 'focus' in client) return client.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});

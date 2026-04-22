// Cosas de Cosas v3.1 — Service Worker con Web Push
// Network-first per RDE Cloud v1 Apéndice PWA

const CACHE_NAME = 'cosas-v31';
const STATIC = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) return;

  const isDoc = request.mode === 'navigate' || request.destination === 'document';
  const isApi = url.pathname.startsWith('/api/');

  if (isDoc || isApi) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy).catch(() => {}));
          return resp;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy).catch(() => {}));
          return resp;
        })
      )
    );
  }
});

// ============= WEB PUSH =============

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Cosas de Cosas', body: event.data ? event.data.text() : 'Nuevo aviso' };
  }

  const title = data.title || 'Cosas de Cosas';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'cosas-notif',
    data: { url: data.url || '/', ...data },
    requireInteraction: data.urgencia === 'urgente',
    vibrate: data.urgencia === 'urgente' ? [200, 100, 200, 100, 200] : [150],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, navegarla
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Si no, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Pushsubscriptionchange: re-suscribir si expira
self.addEventListener('pushsubscriptionchange', (event) => {
  // No re-subscription automática; la app al abrir verificará estado
  console.log('[SW] pushsubscriptionchange event');
});

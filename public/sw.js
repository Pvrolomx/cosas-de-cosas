// Cosas de Cosas — Service Worker
// Network-first para HTML/API, cache-first para assets estáticos
// Ver RDE Cloud v1 — Apéndice PWA (20-Mar-2026)

const CACHE_NAME = 'cosas-v1';
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

  // Ignorar Supabase / websockets / requests no-GET
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;

  const isDoc = request.mode === 'navigate' || request.destination === 'document';
  const isApi = url.pathname.startsWith('/api/');

  if (isDoc || isApi) {
    // Network-first
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
    // Cache-first para assets
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

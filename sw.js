// Service worker: app shell em cache para uso offline. Troque VERSION a cada publicação.
const VERSION = 'dobras-v5';
const SHELL = [
  './', './index.html', './styles.css', './config.js', './manifest.webmanifest',
  './js/app.js', './js/protocols.js', './js/store.js', './js/charts.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && url.hostname !== 'cdn.jsdelivr.net') return; // API do Supabase: sempre rede

  // rede primeiro (sempre a versão mais nova), cache como reserva offline
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      try {
        const res = await fetch(req, sameOrigin ? { cache: 'no-cache' } : undefined);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') return cache.match('./index.html');
        return new Response('Offline', { status: 503 });
      }
    }),
  );
});

// Network-first service worker: updates land immediately when online,
// the app still opens offline from the last cached copy.
const CACHE = 'improve-v5';
const SHELL = ['./', './index.html', './app.css', './logic.js', './app.js', './manifest.webmanifest',
  './fonts/outfit.css', './fonts/outfit-latin.woff2', './fonts/outfit-latin-ext.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((hit) => {
      if (hit) return hit;
      // Only a navigation (loading the app shell itself) falls back to index.html.
      // A missed script/image/etc. request rejects normally instead of coming back
      // typed as HTML.
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return Promise.reject(new Error('offline and not cached'));
    }))
  );
});

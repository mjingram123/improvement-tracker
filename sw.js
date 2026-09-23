// Network-first service worker: updates land immediately when online,
// the app still opens offline from the last cached copy.
const CACHE = 'improve-v7';
const SHELL = ['./', './index.html', './logic.js', './manifest.webmanifest',
  './js/logic-day.js', './js/logic-mind.js', './js/logic-night.js', './js/logic-week.js',
  './js/logic-urge.js', './js/logic-more.js',
  './js/core.js', './js/screens/onboarding.js', './js/screens/day.js', './js/screens/mind.js',
  './js/screens/night.js', './js/screens/week.js', './js/screens/more.js', './js/screens/urge.js',
  './css/base.css', './css/screens/day.css', './css/screens/mind.css', './css/screens/night.css',
  './css/screens/week.css', './css/screens/more.css', './css/screens/urge.css',
  './fonts/outfit.css', './fonts/outfit-latin.woff2', './fonts/outfit-latin-ext.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

// Cache each shell entry individually and ignore failures, so a file that does
// not exist yet in this worktree (another builder's screen/logic file, until
// merge) cannot fail the whole install - see BACKLOG.md M1.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
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

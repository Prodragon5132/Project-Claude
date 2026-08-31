/**
 * Offline support.
 *
 * SafePaste is most useful exactly where the network is not: an air-gapped
 * review room, a plane, a laptop that policy forbids from talking to anything.
 * The app is a handful of static files, so caching them makes the offline claim
 * real rather than aspirational.
 *
 * Only the app shell is cached. Nothing a user types is ever stored here.
 */

const CACHE = 'safepaste-v1';

const SHELL = [
  '/',
  '/app',
  '/app.html',
  '/index.html',
  '/assets/css/main.css',
  '/assets/js/app.js',
  '/assets/js/config.js',
  '/assets/js/license.js',
  '/assets/js/site.js',
  '/assets/js/engine/redact.js',
  '/assets/js/engine/detectors.js',
  '/assets/js/engine/validators.js',
  '/assets/js/engine/lexicon.js',
  '/assets/js/engine/fake.js',
  '/assets/img/favicon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll rejects the whole batch if any one file 404s, which would leave
      // the app with no offline support at all. Cache what we can.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The licence check and runtime config must always be live.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    // Network first so a deploy is picked up immediately, cache as the fallback
    // that makes the tool work with no connection at all.
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/app'))),
  );
});

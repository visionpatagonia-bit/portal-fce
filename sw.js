const CACHE_NAME = 'fce-portal-v1';
const SHELL_FILES = [
  '/portal-fce/index.html',
  '/portal-fce/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

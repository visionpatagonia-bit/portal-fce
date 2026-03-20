// ═══════════════════════════════════════════════════════════════
//  SERVICE WORKER  ·  Portal FCE 2026
//  Estrategia: Network-first para materiales.json (siempre fresco)
//              Cache-first para el resto (offline)
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'fce-portal-v093';
const FONT_CACHE = 'fce-fonts-v093';

const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALL ─────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[FCE SW] Install — cacheando shell');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => {
        console.log('[FCE SW] Shell cacheado OK');
        return self.skipWaiting();
      })
      .catch(err => console.error('[FCE SW] Error en install:', err))
  );
});

// ── ACTIVATE ────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[FCE SW] Activate — limpiando caches viejos');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => {
            console.log('[FCE SW] Eliminando cache viejo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Fuentes Google → cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // materiales.json → SIEMPRE network-first (nunca cacheado)
  // Así cada edición en GitHub se refleja inmediatamente
  if (url.pathname.endsWith('materiales.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))  // offline fallback
    );
    return;
  }

  // Todo lo demás → cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

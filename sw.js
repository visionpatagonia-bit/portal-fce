// ═══════════════════════════════════════════════════════════════
//  SERVICE WORKER  ·  Portal FCE 2026 · V0.9.2IA
//  Estrategia: Cache-First para el shell, Network-First para fuentes
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME   = 'fce-portal-v092ia';
const SHELL_CACHE  = 'fce-shell-v092ia';
const FONTS_CACHE  = 'fce-fonts-v092ia';

// Recursos del shell de la app (siempre offline)
const SHELL_FILES = [
  './portal_fce_V092IA.html',
  './manifest.json',
];

// Fuentes externas a cachear en primer uso
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ── INSTALL: precachear el shell ────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ────────────────────────────
self.addEventListener('activate', event => {
  const currentCaches = [SHELL_CACHE, FONTS_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !currentCaches.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia diferenciada ─────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Fuentes de Google: Cache-First (se cachean en primer uso)
  if (FONT_ORIGINS.some(origin => url.origin === new URL(origin).origin)) {
    event.respondWith(cacheFirstWithFallback(event.request, FONTS_CACHE));
    return;
  }

  // 2. Archivos del shell: Cache-First
  if (event.request.mode === 'navigate' ||
      SHELL_FILES.some(f => url.pathname.endsWith(f.replace('./', '')))) {
    event.respondWith(cacheFirstWithFallback(event.request, SHELL_CACHE));
    return;
  }

  // 3. Todo lo demás: Network-First con fallback a cache
  event.respondWith(networkFirstWithFallback(event.request));
});

// ── Helpers ─────────────────────────────────────────────────────

async function cacheFirstWithFallback(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin red y sin cache: retornar página offline básica
    return offlineFallback();
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Sin conexión · Portal FCE</title>
      <style>
        body { font-family: 'DM Mono', monospace, sans-serif; background:#faf8f5; color:#1a1510;
               display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:20px; text-align:center; }
        .wrap { max-width:340px; }
        .icon { font-size:3rem; margin-bottom:16px; }
        h1 { font-size:1.4rem; margin-bottom:8px; }
        p  { font-size:.8rem; color:#7a7060; line-height:1.6; margin-bottom:20px; }
        a  { background:#1a1510; color:#fff; padding:10px 24px; border-radius:8px; text-decoration:none; font-size:.75rem; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="icon">📵</div>
        <h1>Sin conexión</h1>
        <p>El portal necesita estar cacheado para funcionar offline.<br>
           Abrilo una vez con conexión y quedará disponible sin internet.</p>
        <a href="./portal_fce_V092IA.html">Reintentar</a>
      </div>
    </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* ═══════════════════════════════════════════════════
   IXA v12 — Service Worker
   Gestion du cache et fonctionnement hors ligne
   ═══════════════════════════════════════════════════ */

const CACHE_NAME = 'ixa-v12-cache';
const STATIC_ASSETS = [
  './ixa.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/libs/pptxgen.bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache static assets — ignore failures (CDN may not be available)
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes API (Groq, GitHub, Serper)
  const isAPI = url.hostname.includes('groq.com') ||
                url.hostname.includes('github.com') ||
                url.hostname.includes('serper.dev') ||
                url.hostname.includes('googleapis.com');
  if (isAPI) return;

  // Stratégie: Network First pour les fichiers app, puis fallback cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache les réponses valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Hors ligne : retourner depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Page de fallback pour navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./ixa.html');
          }
          // Réponse vide pour les autres ressources
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

/* ── Message handler ── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

/* IXA v12 — Service Worker */
const CACHE = 'ixa-v12';
const ASSETS = ['./ixa.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(u => c.add(u).catch(()=>{})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('groq.com') || url.hostname.includes('github.com') || url.hostname.includes('serper.dev')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) { const clone = r.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return r;
    }).catch(() => caches.match(e.request).then(cached => cached || (e.request.mode==='navigate' ? caches.match('./ixa.html') : new Response('',{status:503}))))
  );
});

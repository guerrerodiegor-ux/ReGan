/* Registro Ganadero — service worker
   Con señal: carga siempre la última versión publicada.
   Sin señal: abre la copia guardada en el celular. */
const VERSION = 'rg-2026-10-07-4';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(ARCHIVOS.map(u => new Request(u, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'actualizar') self.skipWaiting(); });

function conTiempo(promesa, ms) {
  return new Promise((ok, mal) => { const t = setTimeout(() => mal(new Error('timeout')), ms); promesa.then(r => { clearTimeout(t); ok(r); }, err => { clearTimeout(t); mal(err); }); });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Primero la red (versión más nueva); si no hay señal en 4 s, la copia guardada
    e.respondWith(
      conTiempo(fetch(req, {cache: 'no-store'}), 4000)
        .then(res => { if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copia)); } return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req).then(res => {
    const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); return res;
  })));
});

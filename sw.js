// Tu espacio ConectaTEA — funciona sin conexión.
// La página se pide primero a internet (para que los cambios lleguen al momento) y, si no hay, se usa la guardada.
const VERSION = 'ctea-v1';
const BASE = ['./', './manifest.webmanifest', './logo-blanco.png', './logo-completo.png', './logo-180.png', './logo-192.png', './logo-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La página: primero internet, si no, la guardada (sin tener en cuenta el ?f=...).
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/'))) {
    e.respondWith(fetch(req).then((r) => {
      const copia = r.clone(); caches.open(VERSION).then((c) => c.put('./', copia)); return r;
    }).catch(() => caches.match('./')));
    return;
  }
  // Logos e iconos de la propia app: los guardados, y si no, de internet.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((m) => m || fetch(req).then((r) => {
      const copia = r.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); return r;
    })));
    return;
  }
  // Tipografía de Google: la guardada al momento y se actualiza por detrás.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((m) => {
      const red = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => m);
      return m || red;
    })));
  }
  // Lo demás (los datos de Google Apps Script) no se toca: va siempre a internet.
});

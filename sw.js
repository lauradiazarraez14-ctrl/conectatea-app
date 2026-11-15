// Tu espacio ConectaTEA — funciona sin conexión.
// La página se pide primero a internet (para que los cambios lleguen al momento) y, si no hay, se usa la guardada.
const VERSION = 'ctea-v3';
const BASE = ['./', './manifest.webmanifest', './logo-blanco.png', './logo-completo.png', './logo-180.png', './logo-192.png', './logo-512.png',
  './fuentes/montserrat.css', './fuentes/montserrat-latin.woff2', './fuentes/montserrat-latin-ext.woff2'];

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
    // Si internet tarda más de 2,5 s, se abre la guardada (y la nueva queda lista para la próxima vez).
    const red = fetch(req).then((r) => {
      const copia = r.clone(); caches.open(VERSION).then((c) => c.put('./', copia)); return r;
    });
    e.respondWith(new Promise((ok) => {
      let hecho = false;
      const usarGuardada = () => caches.match('./').then((m) => { if (!hecho && m){ hecho = true; ok(m); } });
      const t = setTimeout(usarGuardada, 2500);
      red.then((r) => { clearTimeout(t); if (!hecho){ hecho = true; ok(r); } })
         .catch(() => { clearTimeout(t); caches.match('./').then((m) => { if (!hecho){ hecho = true; ok(m || Response.error()); } }); });
    }));
    return;
  }
  // Logos, iconos y tipografía de la propia app: los guardados, y si no, de internet.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((m) => m || fetch(req).then((r) => {
      const copia = r.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); return r;
    })));
    return;
  }
  // Lo demás (los datos de Google Apps Script) no se toca: va siempre a internet.
});

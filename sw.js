/* Service Worker — עבודה מלאה ללא אינטרנט, ועדכון בשליטת המשתמש */
const VERSION = 'calisthenics-v2.9.1';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './program.js', './exercises.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-maskable.svg', './icons/icon-192.png',
  './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/icon-square.svg',
];

/* בכוונה בלי skipWaiting אוטומטי: הגרסה החדשה ממתינה עד שהמשתמש מאשר,
   כדי שקבצים לא יתחלפו באמצע אימון שרץ. */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'GET_VERSION' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});

/* קודם רשת (כדי לקבל עדכונים), ואם אין רשת — מהמטמון */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

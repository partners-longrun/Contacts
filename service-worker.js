// Service Worker for 파트너스 연락처 (PWA)
const CACHE_NAME = 'partners-contacts-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network First strategy with Cache Fallback for navigation and HTML
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 구글 스프레드시트 gviz API 요청은 자체 localStorage 캐시(SWR)로 처리하므로 SW 캐싱 제외
  if (req.url.includes('docs.google.com')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // 성공 시 캐시 갱신 (정적 자산)
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Service Worker for Tana Digital Bank (PWA)
// In AI Studio / dev / preview environments (*.run.app, ais-*, localhost), immediately clear caches and unregister
const isPreviewOrDev = 
  self.location.hostname === 'localhost' || 
  self.location.hostname === '127.0.0.1' || 
  self.location.hostname.includes('run.app') ||
  self.location.hostname.includes('ais-') ||
  self.location.hostname.includes('google');

if (isPreviewOrDev) {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.clients.claim())
        .then(() => self.registration.unregister())
    );
  });
  // Never intercept fetch in preview/dev to avoid corrupting Vite module bundles
} else {
  // Static App Shell resources to precache in production
  const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/favicon.svg',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    '/icons/icon-maskable.svg'
  ];

  // Install Event - Precache static app shell
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Pre-caching partial assets:', err);
        });
      }).then(() => self.skipWaiting())
    );
  });

  // Activate Event - Clean up obsolete caches
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Removing old cache version:', key);
              return caches.delete(key);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });

  // Fetch Event - Dynamic caching strategy
  self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Non-GET requests (POST, PUT, DELETE) - Always pass to network (Never cache)
    if (request.method !== 'GET') {
      return;
    }

    // 2. Never cache Vite dev modules, HMR, or API endpoints
    if (
      url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/src/') ||
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/@fs/') ||
      url.pathname.includes('/node_modules/') ||
      url.pathname.includes('/auth') || 
      url.pathname.includes('/transact') ||
      url.searchParams.has('v') ||
      url.searchParams.has('t') ||
      url.searchParams.has('nocache')
    ) {
      return;
    }

    // 3. Navigation (HTML Pages) - Network First with Cache Fallback for offline support
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          })
      );
      return;
    }

    // 4. Static Assets (Production CSS, Images, Fonts) - Stale-While-Revalidate
    const isStaticAsset = 
      url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com');

    if (isStaticAsset) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              return cachedResponse;
            });

          return cachedResponse || fetchPromise;
        })
      );
      return;
    }

    // Default: pass through
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  });
}

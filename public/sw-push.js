/* eslint-disable no-restricted-globals */
/**
 * CBE Mobil & Standalone Sub-App Web Push Service Worker
 * Handles native Lock Screen / Notification Center Web Push events AND persists
 * incoming synced messages directly into local IndexedDB so standalone iPhone
 * Home Screen Web Apps receive synced messages even while closed.
 */

const SW_INBOX_DB_NAME = 'cbe_subapp_inbox_db';
const SW_INBOX_STORE_NAME = 'incoming_items';

self.addEventListener('install', function () {
  if (typeof self.skipWaiting === 'function') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function (event) {
  if (self.clients && typeof self.clients.claim === 'function') {
    event.waitUntil(self.clients.claim());
  }
});

// Intercept dynamic custom app manifests & icons from Cache Storage first so installed PWAs/WebAPKs
// always receive the user's uploaded custom logo even offline or across serverless cold starts.
self.addEventListener('fetch', function (event) {
  try {
    const req = event.request;
    if (!req || req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    const p = url.pathname;
    const isCustomBrandingAsset =
      p === '/api/pwa/manifest' ||
      p === '/api/pwa/icon' ||
      p === '/manifest.webmanifest' ||
      p.indexOf('/manifests/subapp-') === 0;

    if (!isCustomBrandingAsset) return;

    event.respondWith(
      caches
        .open('cbe-custom-branding-cache')
        .then(function (cache) {
          return cache.match(req).then(function (exactHit) {
            if (exactHit) return exactHit;
            // Fallback match without cache-busting `v` query param
            if (p === '/api/pwa/icon' || p === '/api/pwa/manifest') {
              const cleanUrl = new URL(url.href);
              cleanUrl.searchParams.delete('v');
              return cache.match(cleanUrl.pathname + cleanUrl.search).then(function (cleanHit) {
                return cleanHit || fetch(req);
              });
            }
            return cache.match(p).then(function (pathHit) {
              return pathHit || fetch(req);
            });
          });
        })
        .catch(function () {
          return fetch(req);
        })
    );
  } catch (_) {
    // Pass through to network
  }
});

function savePushToIndexedDb(payload) {
  return new Promise(function (resolve) {
    try {
      if (!self.indexedDB || !payload || typeof payload !== 'object') {
        resolve();
        return;
      }
      const req = self.indexedDB.open(SW_INBOX_DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_INBOX_STORE_NAME)) {
          db.createObjectStore(SW_INBOX_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () {
        try {
          const db = req.result;
          const tx = db.transaction(SW_INBOX_STORE_NAME, 'readwrite');
          const store = tx.objectStore(SW_INBOX_STORE_NAME);
          const itemId =
            (payload.smsRecord && payload.smsRecord.id) ||
            payload.tag ||
            'push-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
          store.put({
            id: itemId,
            receivedAt: Date.now(),
            payload: payload,
          });
          tx.oncomplete = function () {
            try {
              db.close();
            } catch (_) {}
            resolve();
          };
          tx.onerror = function () {
            try {
              db.close();
            } catch (_) {}
            resolve();
          };
        } catch (_) {
          resolve();
        }
      };
      req.onerror = function () {
        resolve();
      };
    } catch (_) {
      resolve();
    }
  });
}

function displayBankingNotification(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const title = payload.title || payload.appName || 'CBE Mobil';
  const body = payload.body || 'You have a new account notification.';
  const targetUrl = payload.url || (payload.txId ? '/?tx=' + encodeURIComponent(payload.txId) : '/');

  const options = {
    body: body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || 'cbe-notif-' + Date.now(),
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    data: {
      url: targetUrl,
      txId: payload.txId || null,
      reference: payload.reference || null,
      category: payload.category || 'general',
      view: payload.view || null,
    },
  };

  return self.registration.showNotification(title, options);
}

self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try {
      data = { body: event.data ? event.data.text() : '' };
    } catch (_) {
      data = {};
    }
  }

  event.waitUntil(
    Promise.all([
      savePushToIndexedDb(data),
      displayBankingNotification(data),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          for (let i = 0; i < clientList.length; i++) {
            if (typeof clientList[i].postMessage === 'function') {
              clientList[i].postMessage({
                type: 'CBE_SUBAPP_PUSH_RECEIVED',
                payload: data,
              });
            }
          }
        })
        .catch(function () {}),
    ])
  );
});

self.addEventListener('message', function (event) {
  const msg = event.data;
  if (msg && msg.type === 'CBE_SHOW_LOCAL_NOTIFICATION' && msg.payload) {
    event.waitUntil(displayBankingNotification(msg.payload));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const notifData = (event.notification && event.notification.data) || {};
  const targetUrl = notifData.url || '/';
  const absoluteTarget = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url && client.url.indexOf(self.location.origin) === 0) {
            if (typeof client.postMessage === 'function') {
              client.postMessage({
                type: 'CBE_NOTIFICATION_CLICK',
                url: targetUrl,
                txId: notifData.txId || null,
                reference: notifData.reference || null,
                category: notifData.category || null,
                view: notifData.view || null,
              });
            }
            if (typeof client.focus === 'function') {
              return client.focus();
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(absoluteTarget);
        }
      })
  );
});

const SW_META_DB_NAME = 'cbe_subapp_meta_db';
const SW_META_STORE_NAME = 'meta';

function readSwMeta(key) {
  return new Promise(function (resolve) {
    try {
      if (!self.indexedDB) {
        resolve(null);
        return;
      }
      const req = self.indexedDB.open(SW_META_DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_META_STORE_NAME)) {
          db.createObjectStore(SW_META_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = function () {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(SW_META_STORE_NAME)) {
            db.close();
            resolve(null);
            return;
          }
          const tx = db.transaction(SW_META_STORE_NAME, 'readonly');
          const getReq = tx.objectStore(SW_META_STORE_NAME).get(key);
          getReq.onsuccess = function () {
            const val = getReq.result ? getReq.result.value : null;
            try {
              db.close();
            } catch (_) {}
            resolve(val);
          };
          getReq.onerror = function () {
            try {
              db.close();
            } catch (_) {}
            resolve(null);
          };
        } catch (_) {
          resolve(null);
        }
      };
      req.onerror = function () {
        resolve(null);
      };
    } catch (_) {
      resolve(null);
    }
  });
}

function detectSubAppFromScope() {
  try {
    const scopePath = new URL(self.registration.scope).pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
    if (
      scopePath === 'sms' ||
      scopePath === 'truecaller' ||
      scopePath === 'telebirr' ||
      scopePath === 'dashen' ||
      scopePath === 'telegram' ||
      scopePath === 'phone'
    ) {
      return scopePath;
    }
  } catch (_) {}
  return '';
}

self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
    fetch('/api/subapp/vapid-key', { cache: 'no-store' })
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        if (!json || !json.publicKey) return null;
        const padding = '='.repeat((4 - (json.publicKey.length % 4)) % 4);
        const base64 = (json.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        const keyBytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          keyBytes[i] = raw.charCodeAt(i);
        }
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        });
      })
      .then(function (newSubscription) {
        if (!newSubscription) return;
        const subJson = newSubscription.toJSON();
        const subAppId = detectSubAppFromScope();

        // Automatically re-register rotated token under permanent pairId even while app is closed!
        const serverSyncPromise = subAppId
          ? readSwMeta('pair_' + subAppId)
              .then(function (pairId) {
                if (!pairId) return;
                return fetch('/api/subapp/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bucketKey: pairId,
                    subAppId: subAppId,
                    platform: 'android',
                    replaceExisting: true,
                    subscription: subJson,
                  }),
                });
              })
              .catch(function () {})
          : Promise.resolve();

        const notifyClientsPromise = self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then(function (clients) {
            for (let i = 0; i < clients.length; i++) {
              clients[i].postMessage({
                type: 'CBE_PUSH_SUBSCRIPTION_CHANGED',
                subAppId: subAppId || null,
                subscription: subJson,
              });
            }
          });

        return Promise.all([serverSyncPromise, notifyClientsPromise]);
      })
      .catch(function (err) {
        console.warn('[sw-push] pushsubscriptionchange warning:', err);
      })
  );
});

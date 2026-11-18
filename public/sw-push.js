/* eslint-disable no-restricted-globals */
/**
 * CBE Mobil Web Push Service Worker Extension
 * Handles native Lock Screen / Notification Center Web Push events on:
 * - iOS 16.4+ Safari Home Screen Web Apps (APNs Web Push)
 * - Android Chrome Installed PWAs
 * - Desktop Chromium / Firefox / Safari
 */

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

function displayBankingNotification(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const title = payload.title || payload.appName || 'CBE Mobil';
  const body = payload.body || 'You have a new account notification.';
  const targetUrl = payload.url || (payload.txId ? '/?tx=' + encodeURIComponent(payload.txId) : '/');

  const options = {
    body: body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || ('cbe-notif-' + Date.now()),
    renotify: true,
    requireInteraction: false,
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    data: {
      url: targetUrl,
      txId: payload.txId || null,
      reference: payload.reference || null,
      category: payload.category || 'general',
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

  event.waitUntil(displayBankingNotification(data));
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

self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
    fetch('/api/notifications/vapid-public-key')
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
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
          for (let i = 0; i < clients.length; i++) {
            clients[i].postMessage({
              type: 'CBE_PUSH_SUBSCRIPTION_CHANGED',
              subscription: newSubscription.toJSON(),
            });
          }
        });
      })
      .catch(function (err) {
        console.warn('[sw-push] pushsubscriptionchange warning:', err);
      })
  );
});

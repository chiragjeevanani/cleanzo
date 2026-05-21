// Firebase Messaging Service Worker — Cleanzo
// This file MUST be at /public/firebase-messaging-sw.js so it is served from the root.
// It handles background push notifications when the app is not in focus.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ─── Firebase config parsed dynamically from query parameters ──────────────
const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey') || 'your_firebase_api_key_here';
const messagingSenderId = urlParams.get('messagingSenderId') || 'your_messaging_sender_id_here';
const appId = urlParams.get('appId') || 'your_firebase_app_id_here';

const firebaseConfig = {
  apiKey,
  authDomain:        'cleanzo-2c7aa.firebaseapp.com',
  projectId:         'cleanzo-2c7aa',
  storageBucket:     'cleanzo-2c7aa.firebasestorage.app',
  messagingSenderId,
  appId,
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ─── Background Messages ────────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background push received:', payload);

  const { title, body, icon, data } = payload.notification || {};
  const notifTitle = title || 'Cleanzo';
  const notifOptions = {
    body: body || 'You have a new notification.',
    icon: icon || '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [{ action: 'open', title: 'Open App' }],
  };

  self.registration.showNotification(notifTitle, notifOptions);
});

// ─── Notification Click Deep-Link Handler ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const deepLink = data.link || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'PUSH_DEEP_LINK', link: deepLink });
          return;
        }
      }
      // Open a new window if app is not running
      if (clients.openWindow) {
        return clients.openWindow(deepLink);
      }
    })
  );
});

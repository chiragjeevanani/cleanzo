/**
 * pushNotification.service.js
 * ────────────────────────────────────────────────────────────────────────────
 * Orchestrates the full FCM web push lifecycle:
 *   1. Register the Firebase service worker
 *   2. Request browser notification permission
 *   3. Get the FCM token
 *   4. Save it to the backend
 *   5. Set up the foreground message handler
 */

import { getFirebaseMessaging, getToken, onMessage } from '../firebase.js';
import apiClient from './apiClient.js';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Role → API endpoint prefix map
const ROLE_ENDPOINT = {
  customer:   '/customer/fcm-token',
  cleaner:    '/cleaner/fcm-token',
  admin:      '/admin/fcm-token',
  superadmin: '/admin/fcm-token',
  society:    '/society/fcm-token',
};

// ─── Register FCM service worker ─────────────────────────────────────────────
let swRegistration = null;

export async function registerFcmServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
    const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';

    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(apiKey)}&messagingSenderId=${encodeURIComponent(messagingSenderId)}&appId=${encodeURIComponent(appId)}`;

    swRegistration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (err) {
    console.error('[FCM] Service worker registration failed:', err);
    return null;
  }
}

// ─── Request browser notification permission ──────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const permission = await Notification.requestPermission();
  return permission; // 'granted' | 'denied' | 'default'
}

// ─── Get FCM device token ─────────────────────────────────────────────────────
export async function getFcmToken() {
  try {
    const messaging = getFirebaseMessaging();
    const sw = swRegistration || (await registerFcmServiceWorker());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });
    return token || null;
  } catch (err) {
    console.error('[FCM] Failed to get token:', err);
    return null;
  }
}

// ─── Save FCM token to backend ───────────────────────────────────────────────
export async function saveFcmTokenToServer(token, role) {
  const endpoint = ROLE_ENDPOINT[role];
  if (!endpoint) return;
  try {
    await apiClient.post(endpoint, { token });
  } catch (err) {
    console.error('[FCM] Failed to save token to server:', err);
  }
}

// ─── Remove FCM token from backend ───────────────────────────────────────────
export async function removeFcmTokenFromServer(token, role) {
  const endpoint = ROLE_ENDPOINT[role];
  if (!endpoint || !token) return;
  try {
    await apiClient.delete(endpoint, { data: { token } });
  } catch { /* non-fatal on logout */ }
}

// ─── Foreground message handler ───────────────────────────────────────────────
/**
 * @param {(payload: { title: string, body: string, data: object }) => void} callback
 */
export function setupForegroundHandler(callback) {
  try {
    const messaging = getFirebaseMessaging();
    return onMessage(messaging, (payload) => {
      const { notification, data } = payload;
      callback({
        title: notification?.title || 'Cleanzo',
        body:  notification?.body  || 'You have a new notification.',
        data:  data || {},
      });
    });
  } catch {
    return () => {};
  }
}

// ─── Deep-link handler from service worker postMessage ────────────────────────
export function setupDeepLinkHandler(navigate) {
  const handler = (event) => {
    if (event.data?.type === 'PUSH_DEEP_LINK' && event.data?.link) {
      navigate(event.data.link);
    }
  };
  navigator.serviceWorker?.addEventListener('message', handler);
  return () => navigator.serviceWorker?.removeEventListener('message', handler);
}

// ─── Main initializer — call this after login ─────────────────────────────────
/**
 * @param {string} role  One of: customer | cleaner | admin | superadmin | society
 * @returns {{ token: string|null, permission: string }}
 */
export async function initPushNotifications(role) {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || apiKey === 'your_firebase_api_key_here' || !VAPID_KEY || VAPID_KEY === 'your_vapid_key_here') {
    console.warn('[FCM] Firebase credentials not configured — skipping push init');
    return { token: null, permission: 'skipped' };
  }

  const sw = await registerFcmServiceWorker();
  if (!sw) return { token: null, permission: 'unsupported' };

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { token: null, permission };
  }

  const token = await getFcmToken();
  if (token) {
    await saveFcmTokenToServer(token, role);
    localStorage.setItem('fcm_token', token);
    localStorage.setItem('fcm_role', role);
  }

  return { token, permission };
}

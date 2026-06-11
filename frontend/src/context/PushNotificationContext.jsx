/**
 * PushNotificationContext.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Manages the complete FCM push notification lifecycle for all Cleanzo modules.
 * Wraps the push service and integrates with AuthContext and ToastContext.
 *
 * Usage:
 *   const { isEnabled, isLoading, initPush } = usePushNotifications()
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocietyAuth } from './SocietyAuthContext';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';
import {
  initPushNotifications,
  setupForegroundHandler,
  setupDeepLinkHandler,
  removeFcmTokenFromServer,
} from '../services/pushNotification.service.js';

const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.play().catch((err) => {
      console.warn('[Push] Browser blocked audio autoplay:', err.message);
    });
  } catch (err) {
    console.error('[Push] Failed to play notification sound:', err);
  }
};

const PushNotificationContext = createContext(null);

export function PushNotificationProvider({ children }) {
  const auth = useAuth();
  const societyAuth = useSocietyAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled]   = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const initializedRef = useRef(false);
  const cleanupForeground = useRef(null);
  const cleanupDeepLink   = useRef(null);

  const currentUser = auth?.user || societyAuth?.societyUser;

  // ─── Browser FCM Capability Diagnostics ─────────────────────────────────
  useEffect(() => {
    const runDiagnostics = () => {
      const isSecure = window.isSecureContext;
      const hasSW = 'serviceWorker' in navigator;
      const hasNotification = 'Notification' in window;
      const perm = hasNotification ? Notification.permission : 'unsupported';

      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      const isApiOk = apiKey && apiKey !== 'your_firebase_api_key_here' && apiKey.trim() !== '';
      const isSenderOk = messagingSenderId && messagingSenderId !== 'your_messaging_sender_id_here' && messagingSenderId.trim() !== '';
      const isVapidOk = vapidKey && vapidKey !== 'your_vapid_key_here' && vapidKey.trim() !== '';

      console.log('%c🔍 [FCM Diagnostic Checklist]', 'color: #38bdf8; font-weight: bold; font-size: 13px;');
      console.table({
        'Secure Context (HTTPS/localhost)': { Value: isSecure ? '✅ Yes' : '❌ No (FCM BLOCKED BY BROWSER)' },
        'Service Worker Support': { Value: hasSW ? '✅ Yes' : '❌ No (PWA/SW not supported)' },
        'Notification API Support': { Value: hasNotification ? '✅ Yes' : '❌ No (Unsupported browser)' },
        'Notification Permission State': { Value: perm },
        'Vite Firebase API Key Configured': { Value: isApiOk ? '✅ Yes' : '❌ No (Placeholder or Empty)' },
        'Vite Firebase Sender ID Configured': { Value: isSenderOk ? '✅ Yes' : '❌ No (Placeholder or Empty)' },
        'Vite Firebase VAPID Key Configured': { Value: isVapidOk ? '✅ Yes' : '❌ No (Placeholder or Empty)' },
      });

      if (!isSecure) {
        console.warn('%c⚠️ WARNING: You are not in a secure context! Browsers will block push notifications unless accessed via HTTPS or localhost.', 'color: #fbbf24; font-weight: bold;');
      }
    };
    runDiagnostics();
  }, []);

  // ─── Auto-initialize when user logs in ──────────────────────────────────
  useEffect(() => {
    if (!currentUser || initializedRef.current) return;

    const role = currentUser.role;
    if (!['customer', 'cleaner', 'admin', 'superadmin', 'society'].includes(role)) return;

    // Don't block UI — run async in background
    (async () => {
      setIsLoading(true);
      try {
        const { token, permission } = await initPushNotifications(role);

        if (permission === 'granted' && token) {
          setIsEnabled(true);
          initializedRef.current = true;

           // ── Foreground notifications → show as in-app toast ──
           cleanupForeground.current = setupForegroundHandler(({ title, body, data }) => {
             const hasLink = data?.link && data.link !== '/';
             playNotificationSound();
             showToast(
               `🔔 ${title}: ${body}`,
               'info',
               5000,
               hasLink ? () => navigate(data.link) : null
             );
           });

          // ── Background deep-links (from SW postMessage) ──
          cleanupDeepLink.current = setupDeepLinkHandler(navigate);
        }
      } catch (err) {
        console.warn('[Push] Init failed:', err);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      cleanupForeground.current?.();
      cleanupDeepLink.current?.();
    };
  }, [currentUser, navigate, showToast]);

  // ─── Clean up when user logs out ─────────────────────────────────────────
  useEffect(() => {
    if (currentUser) return;
    if (!initializedRef.current) return;

    // Remove FCM token from server on logout
    const token = localStorage.getItem('fcm_token');
    const role  = localStorage.getItem('fcm_role');
    if (token && role) {
      removeFcmTokenFromServer(token, role).catch(() => {});
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_role');
    }

    // Reset state
    setIsEnabled(false);
    initializedRef.current = false;
    cleanupForeground.current?.();
    cleanupDeepLink.current?.();
  }, [currentUser]);

  // ─── Manual init trigger (e.g., from a settings page) ───────────────────
  const initPush = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { token, permission } = await initPushNotifications(currentUser.role);
      if (permission === 'granted' && token) {
        setIsEnabled(true);
        initializedRef.current = true;
      }
      return { token, permission };
    } catch (err) {
      console.error('[Push] Manual init failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  return (
    <PushNotificationContext.Provider value={{ isEnabled, isLoading, initPush }}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const ctx = useContext(PushNotificationContext);
  if (!ctx) throw new Error('usePushNotifications must be used inside PushNotificationProvider');
  return ctx;
}

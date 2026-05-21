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

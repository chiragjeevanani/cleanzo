import admin from 'firebase-admin';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─── Initialize Firebase Admin ────────────────────
let initialized = false;

function getAdmin() {
  if (!initialized) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!serviceAccountJson && !serviceAccountPath) {
      console.warn('⚠️  Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FIREBASE_SERVICE_ACCOUNT_PATH set — push notifications disabled');
      return null;
    }

    try {
      let serviceAccount;
      if (serviceAccountJson) {
        serviceAccount = JSON.parse(serviceAccountJson);
      } else {
        const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
        serviceAccount = require(resolvedPath);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log('✅ Firebase Admin SDK initialized');
    } catch (err) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
      return null;
    }
  }
  return admin;
}

// ─── Send push to an array of tokens ─────────────
/**
 * @param {string[]} tokens  Array of FCM tokens
 * @param {{ title: string, body: string, data?: Record<string,string>, imageUrl?: string }} payload
 */
export async function sendPushNotification(tokens, payload) {
  const firebaseAdmin = getAdmin();
  if (!firebaseAdmin) return null;
  if (!tokens || tokens.length === 0) return null;

  // FCM data values must all be strings
  const dataPayload = {};
  if (payload.data) {
    for (const [key, val] of Object.entries(payload.data)) {
      dataPayload[key] = String(val);
    }
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    },
    data: dataPayload,
    tokens,
    webpush: {
      notification: {
        icon: '/logo.png',
        badge: '/logo.png',
        click_action: dataPayload.link || '/',
      },
    },
    android: {
      priority: 'high',
      notification: {
        icon: 'ic_notification',
        color: '#65C737',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: process.env.FCM_NOTIFICATION_SOUND || 'default',
        notificationPriority: 'PRIORITY_HIGH',
        defaultVibrateTimings: true,
        ...(process.env.FCM_ANDROID_CHANNEL_ID ? { channelId: process.env.FCM_ANDROID_CHANNEL_ID } : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: process.env.FCM_NOTIFICATION_SOUND || 'default',
        },
      },
    },
  };

  try {
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    const successCount = response.responses.filter(r => r.success).length;
    const failureCount = response.responses.filter(r => !r.success).length;
    if (failureCount > 0) {
      console.warn(`⚠️  FCM: ${successCount} sent, ${failureCount} failed`);
    }
    return response;
  } catch (err) {
    console.error('❌ FCM sendEachForMulticast error:', err.message);
    return null;
  }
}

// ─── Deep-link map per notification type ─────────
export const NOTIFICATION_LINKS = {
  // Customer
  subscription_created:   '/customer/subscriptions',
  task_completed:         '/customer/history',
  service_skipped:        '/customer/subscriptions',
  // Cleaner
  task_assigned:          '/cleaner/tasks',
  kyc_approved:           '/cleaner',
  kyc_rejected:           '/cleaner/kyc',
  // Admin
  kyc_submitted:          '/admin/applications',
  grievance_filed:        '/admin/grievances',
  // Society
  commission_earned:      '/society/commissions',
};

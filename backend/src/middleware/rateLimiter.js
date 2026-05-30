import rateLimit from 'express-rate-limit';

const skipInTest = () => process.env.NODE_ENV === 'test';

// ─── Key generators ───────────────────────────────────────────────────────────
// Authenticated routes key by user ID so users behind the same NAT/WiFi don't
// share a counter.  Falls back to IP for unauthenticated requests.
const byUserId = (req) => req.user?._id?.toString() || req.ip;
const byIp     = (req) => req.ip;

// ─── Global IP guard (app.js) ─────────────────────────────────────────────────
// High ceiling — only stops raw DDoS / runaway bots.
// Role-specific limiters below handle the real throttling.
export const globalIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 min
  max: 2000,                    // 2 000 req / 15 min per IP
  keyGenerator: byIp,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Customer routes ──────────────────────────────────────────────────────────
// 300 req / 15 min per user.
// Covers: home refresh, booking flow (8–10 calls), subscriptions, history, profile.
export const customerApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: byUserId,
  skip: skipInTest,
  message: { success: false, message: 'You are making too many requests. Please slow down and try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Cleaner routes ───────────────────────────────────────────────────────────
// 500 req / 15 min per user.
// Covers: task status updates on every car wash, photo uploads (multi-part),
// attendance auto-mark, task list polling.
export const cleanerApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: byUserId,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests. Please wait a moment before continuing.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Admin routes ─────────────────────────────────────────────────────────────
// 800 req / 15 min per admin user.
// Covers: dashboard (25+ parallel queries), bulk cleaner list syncs,
// subscription assignment, broadcast notifications, Excel exports.
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 800,
  keyGenerator: byUserId,
  skip: skipInTest,
  message: { success: false, message: 'Admin rate limit reached. Please wait a few minutes before continuing.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Payment routes ───────────────────────────────────────────────────────────
// 20 req / 15 min per user — strict to prevent payment abuse.
// Normal flow needs only 2–3 calls (create order, verify, subscribe).
export const paymentApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: byUserId,
  skip: skipInTest,
  message: { success: false, message: 'Too many payment requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public / unauthenticated routes ─────────────────────────────────────────
// 150 req / 15 min per IP (no user yet at this point).
// Covers: society listing, package listing, brand listing used in booking flow.
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  keyGenerator: byIp,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Society (partner) routes ─────────────────────────────────────────────────
// 200 req / 15 min per user.
export const societyApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: byUserId,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Auth-specific limiters (unchanged) ───────────────────────────────────────
// OTP send: max 5 per minute per IP
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: byIp,
  skip: skipInTest,
  message: { success: false, message: 'Too many OTP requests. Please try again after 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verify + password login: max 10 per 15 min per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: byIp,
  skip: skipInTest,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login: max 5 per 15 min per IP
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: byIp,
  skip: skipInTest,
  message: { success: false, message: 'Too many admin login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Keep legacy export alias so existing auth route imports don't break
export const adminLimiter = adminLoginLimiter;

// Keep legacy export so app.js import doesn't break before we update it
export const apiLimiter = globalIpLimiter;

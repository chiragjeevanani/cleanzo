import rateLimit from 'express-rate-limit';

const skipInTest = () => process.env.NODE_ENV === 'test';

// OTP send rate limiter: max 5 requests per minute per IP
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skip: skipInTest,
  message: { success: false, message: 'Too many OTP requests. Please try again after 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verify + password login rate limiter: max 10 attempts per 15 minutes per IP
// Prevents brute-force of OTP codes and passwords
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: skipInTest,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login rate limiter: max 5 attempts per 15 minutes per IP
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: skipInTest,
  message: { success: false, message: 'Too many admin login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: skipInTest,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

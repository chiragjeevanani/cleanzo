import { randomInt } from 'crypto';

/**
 * Normalize phone number: strip spaces, dashes, +91 prefix
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  return cleaned;
}

/**
 * Generate a cryptographically secure random 6-digit OTP
 */
export function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

/**
 * Format currency for display (INR)
 */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Human-readable relative time (e.g. "2 min ago", "3 hrs ago")
 */
export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

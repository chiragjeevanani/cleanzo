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
 * Generate a random 4-digit OTP
 */
export function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Format currency for display (INR)
 */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

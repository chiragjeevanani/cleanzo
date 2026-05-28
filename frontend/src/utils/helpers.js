/**
 * Human-readable relative time (e.g. "2 min ago", "3 hrs ago")
 */
export function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Format currency for display (INR)
 */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Retrieve the current application logo URL based on theme
 */
export function getAppLogo(theme) {
  let activeTheme = theme;
  if (!activeTheme && typeof document !== 'undefined') {
    activeTheme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
  }
  if (!activeTheme) activeTheme = 'dark';

  if (activeTheme === 'light') {
    return localStorage.getItem('cleanzo_light_logo') || '/logo.png';
  }
  return localStorage.getItem('cleanzo_dark_logo') || '/logo.png';
}

/**
 * Validate that a name contains only letters and spaces, and is of reasonable length.
 */
export function validateName(name) {
  if (!name) return false;
  return /^[a-zA-Z\s]{2,50}$/.test(name.trim());
}

/**
 * Clean a phone number and validate it is a valid 10-digit number.
 * Supports standard 10-digit format and 12-digit Indian formats starting with 91.
 */
export function validatePhone(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  const cleanPhone = (digits.length === 12 && digits.startsWith('91')) ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(cleanPhone);
}

/**
 * Clean and return the standard 10-digit phone number, or the original if not matching.
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return (digits.length === 12 && digits.startsWith('91')) ? digits.slice(2) : digits;
}

/**
 * Validate standard 6-digit Indian Pincode.
 */
export function validatePincode(pincode) {
  if (!pincode) return false;
  const cleanPin = pincode.replace(/\D/g, '');
  return /^[1-9][0-9]{5}$/.test(cleanPin);
}

/**
 * Validate and format City/State (Letters, spaces, Title Case / Camel Case).
 */
export function formatCityState(text) {
  if (!text) return '';
  const trimmed = text.trim();
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) return '';
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate standard Email format.
 */
export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}



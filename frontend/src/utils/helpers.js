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


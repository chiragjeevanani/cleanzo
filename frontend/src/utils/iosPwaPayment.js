// iOS standalone-PWA payment handoff.
//
// An installed (home-screen) PWA on iOS runs inside a sandboxed WebView that
// CANNOT launch external apps (PayTM/GPay/PhonePe) via UPI deep links — taps on
// a UPI app silently do nothing. The only reliable fix is to run the Razorpay
// checkout in real Safari, where the app handoff works. We do that by opening a
// minimal, auth-free `/pay` bridge route in Safari via window.open(). Razorpay's
// unprotected /payment/callback finalizes the booking server-side from the order
// notes, so the Safari tab needs no login or app state.

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '')

export const isIOS = () => /iPhone|iPad|iPod/i.test(ua())

// True only when the app is launched from the installed home-screen icon, where
// the external-app handoff limitation applies. Plain mobile Safari is fine.
export const isIOSStandalone = () => {
  if (!isIOS()) return false
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true
  try {
    return !!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}

// Build the URL for the /pay bridge. Only public values travel here — the
// Razorpay key_id is publishable and the order id is not secret (the server
// re-verifies the signature), so there is no token or secret in the URL.
export function buildPayUrl({ key, order, callbackUrl, name, description, contact, email, color }) {
  const params = new URLSearchParams({
    key: key || '',
    orderId: order?.id || '',
    amount: order?.amount != null ? String(order.amount) : '',
    currency: order?.currency || 'INR',
    name: name || 'Cleanzo',
    description: description || '',
    contact: contact || '',
    email: email || '',
    callbackUrl: callbackUrl || '',
    color: color || '#0056B3',
  })
  return `${window.location.origin}/pay?${params.toString()}`
}

// Open the checkout in Safari (escapes the standalone WebView). MUST be called
// synchronously inside the tap handler or iOS will block the popup.
export function openCheckoutInSafari(args) {
  return window.open(buildPayUrl(args), '_blank')
}

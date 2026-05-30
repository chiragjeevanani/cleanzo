/**
 * Vercel Serverless Function — /api/payment-callback
 *
 * Why this exists:
 *   On mobile, Razorpay's card/3DS payment flow ALWAYS does a full-page browser
 *   redirect, regardless of the `redirect` flag in the checkout options.  After the
 *   bank 3DS page it POSTs the result to `callback_url`.  A React SPA cannot receive
 *   a POST, so we use this serverless function as the callback receiver.
 *
 * What it does:
 *   1. Receives Razorpay's POST (application/x-www-form-urlencoded)
 *   2. Extracts the payment params (or error)
 *   3. Redirects the browser back to the appropriate React route with params in the URL
 *   4. React reads those URL params, calls the backend to verify & create the
 *      subscription, then shows the success / failure screen.
 *
 * URL param `type`:
 *   ?type=booking   → redirects to /customer/booking
 *   ?type=extension → redirects to /customer/packages  (subscription extension)
 *
 * Vercel functions take precedence over SPA rewrites, so this route is never
 * caught by the "/(.*) → /index.html" rewrite in vercel.json.
 */
export default function handler(req, res) {
  // Allow GET for health-check / accidental browser navigation
  if (req.method === 'GET') {
    return res.redirect(302, '/')
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const type = req.query?.type || 'booking'
  const returnBase = type === 'extension' ? '/customer/packages' : '/customer/booking'

  // Razorpay POSTs as application/x-www-form-urlencoded — Vercel auto-parses this
  const body = req.body || {}
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    error,
  } = body

  // ── Payment failed (Razorpay sends an `error` field) ─────────────────────
  if (error) {
    let errMsg = 'Payment failed'
    try {
      const parsed = typeof error === 'string' ? JSON.parse(error) : error
      errMsg = parsed?.description || parsed?.reason || String(error)
    } catch {
      errMsg = String(error)
    }
    return res.redirect(
      302,
      `${returnBase}?status=failed&error=${encodeURIComponent(errMsg)}`
    )
  }

  // ── Missing params ────────────────────────────────────────────────────────
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.redirect(
      302,
      `${returnBase}?status=failed&error=${encodeURIComponent('Missing payment parameters')}`
    )
  }

  // ── Success — pass params to the SPA so it can verify & subscribe ─────────
  const params = new URLSearchParams({
    status: 'payment_return',
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    ...(type === 'extension' ? { extended: 'true' } : {}),
  })

  return res.redirect(302, `${returnBase}?${params}`)
}

import { useEffect, useState } from 'react'

// Public, auth-free payment bridge. Opened in real Safari (via window.open) from
// the installed iOS PWA so Razorpay checkout can hand off to UPI apps — which the
// standalone PWA WebView blocks.
//
// IMPORTANT: this uses Razorpay's *in-page* checkout (a `handler`), NOT redirect
// mode. Redirect mode breaks iOS — the first tap on a UPI app (PayTM/GPay) fails
// to launch it, forcing a cancel + retry. In-page checkout launches the app on the
// first tap in Safari. Because this tab is auth-free, finalization can't call the
// protected subscription API, so the handler POSTs the verified payment to the
// unprotected /payment/callback (?responseType=json), which finalizes the booking
// server-side from the order notes and returns the result. See
// utils/iosPwaPayment.js and controllers/payment.controller.js for the rationale.
export default function PayBridge() {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params      = new URLSearchParams(window.location.search)
    const key         = params.get('key')
    const orderId     = params.get('orderId')
    const amount      = params.get('amount')
    const currency    = params.get('currency') || 'INR'
    const name        = params.get('name') || 'Cleanzo'
    const description = params.get('description') || ''
    const contact     = params.get('contact') || ''
    const email       = params.get('email') || ''
    const callbackUrl = params.get('callbackUrl') || ''
    const color       = params.get('color') || '#0056B3'

    if (!key || !orderId || !callbackUrl) {
      setError('Missing payment details. Please return to the app and tap Pay again.')
      return
    }

    let cancelled = false

    // Finalize the booking server-side via the auth-free callback (JSON mode), then
    // show a return prompt. The PWA shell detects the new subscription on return.
    const finalize = async (response) => {
      try {
        const sep = callbackUrl.includes('?') ? '&' : '?'
        const res = await fetch(`${callbackUrl}${sep}responseType=json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (data.success) { setDone(true); return }
        // Surface the failure reason carried on the redirect URL, if any.
        let reason = 'Payment could not be finalized.'
        try {
          const u = new URL(data.redirectUrl, window.location.origin)
          reason = u.searchParams.get('error') || reason
        } catch {}
        setError(`${reason} Please return to the app and check your bookings.`)
      } catch {
        setError('Payment was captured but finalizing failed. Please return to the app and check your bookings.')
      }
    }

    const open = () => {
      if (cancelled || !window.Razorpay) return
      try {
        const rzp = new window.Razorpay({
          key,
          ...(amount ? { amount: Number(amount) } : {}),
          currency,
          name,
          description,
          order_id: orderId,
          // In-page checkout (no redirect) — reliable UPI app handoff on iOS Safari.
          handler: finalize,
          // Show the full list of payment methods rather than a single preferred one.
          config: { display: { preferences: { show_default_blocks: true } } },
          prefill: { contact, email },
          theme: { color },
        })
        rzp.on('payment.failed', (r) => {
          setError(r?.error?.description || 'Payment failed. Please return to the app and try again.')
        })
        rzp.open()
      } catch {
        setError('Could not open the payment screen. Please return to the app and try again.')
      }
    }

    if (window.Razorpay) { open(); return }

    const SRC = 'https://checkout.razorpay.com/v1/checkout.js'
    let script = document.querySelector(`script[src="${SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SRC
      script.async = true
      document.body.appendChild(script)
    }
    const poll = setInterval(() => {
      if (window.Razorpay) { clearInterval(poll); open() }
    }, 150)
    const timeout = setTimeout(() => {
      clearInterval(poll)
      if (!window.Razorpay) setError('Payment is taking too long to load. Please check your connection and try again.')
    }, 12000)

    return () => { cancelled = true; clearInterval(poll); clearTimeout(timeout) }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24,
      textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0A0A0A', color: '#fff',
    }}>
      {error ? (
        <>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 16, maxWidth: 320, lineHeight: 1.5 }}>{error}</div>
        </>
      ) : done ? (
        <>
          <div style={{ fontSize: 44 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Payment successful</div>
          <div style={{ fontSize: 14, opacity: 0.7, maxWidth: 320, lineHeight: 1.5 }}>
            Your booking is confirmed. You can close this tab and return to the Cleanzo app.
          </div>
        </>
      ) : (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
            animation: 'paybridge-spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 16 }}>Opening secure payment…</div>
          <div style={{ fontSize: 13, opacity: 0.6, maxWidth: 320, lineHeight: 1.5 }}>
            Complete your payment here, then return to the Cleanzo app.
          </div>
          <style>{`@keyframes paybridge-spin { to { transform: rotate(360deg) } }`}</style>
        </>
      )}
    </div>
  )
}

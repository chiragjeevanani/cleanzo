import { useEffect, useState } from 'react'

// Public, auth-free payment bridge. Opened in real Safari (via window.open) from
// the installed iOS PWA so Razorpay's redirect-mode checkout can hand off to UPI
// apps — which the standalone PWA WebView blocks. All booking context lives in
// the Razorpay order notes, and the unprotected /payment/callback finalizes the
// purchase server-side, so this page needs no login or app state. See
// utils/iosPwaPayment.js for the full rationale.
export default function PayBridge() {
  const [error, setError] = useState('')

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
          // Redirect mode: after payment Razorpay POSTs to the backend callback,
          // which finalizes the booking and redirects this Safari tab to a
          // success page. Works here because we are in Safari, not the PWA shell.
          redirect: true,
          callback_url: callbackUrl,
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

import { useEffect } from 'react'

// Shown in the installed iOS PWA after the checkout is opened in Safari (see
// utils/iosPwaPayment.js). The payment completes in the Safari tab and the
// backend callback finalizes it server-side; when the user switches back to the
// app we refresh data on focus so the new/updated subscription appears. The
// parent decides when the expected change has arrived and dismisses this.
export default function ExternalPaymentWaiting({ onRefresh, onCancel }) {
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') onRefresh?.() }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [onRefresh])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: 'var(--surface, #fff)',
        color: 'var(--text, #0A0A0A)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '28px 22px calc(28px + env(safe-area-inset-bottom))', textAlign: 'center',
      }}>
        <div style={{ fontSize: 38, marginBottom: 12 }}>🧾</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Finish payment in the browser
        </div>
        <div style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.5, marginBottom: 22 }}>
          We opened a secure payment tab in Safari so your UPI app (PayTM, GPay…)
          can open. Complete the payment there, then come back to this app.
        </div>
        <button
          onClick={onRefresh}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: 'var(--accent, #0056B3)', color: '#fff', fontSize: 16,
            fontWeight: 600, cursor: 'pointer', marginBottom: 10,
          }}
        >
          I've completed the payment
        </button>
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.15)', background: 'transparent',
            color: 'inherit', fontSize: 15, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

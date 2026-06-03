import { HandCoins, CheckCircle2 } from 'lucide-react'

/**
 * "Pay to Cleaner" checkout confirmation.
 *
 * Used while the live Razorpay flow is disabled (FEATURES.RAZORPAY_ENABLED =
 * false). The customer agrees to hand the amount to the cleaner in cash and
 * the subscription is activated immediately. Restoring Razorpay (flipping the
 * flag) means this modal is simply no longer reached.
 */
export default function PayToCleanerModal({ amount, description, processing, onConfirm, onDismiss }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => !processing && onDismiss?.()}>
      <div
        className="modal-content glass animate-scale-in"
        style={{ maxWidth: 380, padding: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(101,199,55,0.12)', color: 'var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <HandCoins size={28} />
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>
          Pay to Cleaner
        </h3>

        <div style={{ textAlign: 'center', margin: '12px 0' }}>
          <div className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>AMOUNT TO PAY IN CASH</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
            ₹{Number(amount ?? 0).toLocaleString('en-IN')}
          </div>
          {description && (
            <div className="text-body-sm text-secondary" style={{ marginTop: 4 }}>{description}</div>
          )}
        </div>

        <p className="text-body-sm text-secondary" style={{ textAlign: 'center', margin: '12px 0 20px', lineHeight: 1.5 }}>
          You'll hand this amount to the cleaner in cash at the time of service. Your subscription will be activated right away.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={processing}
            className="btn w-full"
            style={{ background: 'var(--accent-lime)', color: '#000', height: 50, fontWeight: 800, gap: 8 }}
          >
            <CheckCircle2 size={18} /> {processing ? 'Activating…' : 'Confirm & Activate'}
          </button>
          <button
            onClick={onDismiss}
            disabled={processing}
            className="btn btn-ghost w-full"
            style={{ height: 46, color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, SkipForward, Clock, TrendingUp, XCircle, PhoneCall, Mail, X, Car } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function SubscriptionDetail() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [subscriptions, setSubscriptions] = useState([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [support] = useState(() => {
    try {
      const cached = localStorage.getItem('cleanzo_cms_support')
      if (cached) return JSON.parse(cached)
    } catch (e) { /* ignore */ }
    return { whatsapp: '919555860362', phone: '+919555860362', email: 'hello@trycleanzo.com' }
  })

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.get('status') === 'success') {
      if (query.get('upgraded') === 'true') showToast('Plan upgraded successfully! 🎉', 'success')
      else if (query.get('extended') === 'true') showToast('Plan extended successfully! 🎉', 'success')
      navigate(window.location.pathname, { replace: true })
    }
  }, [showToast, navigate])

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const res = await apiClient.get('/customer/subscriptions')
        const all = res.subscriptions || []
        // Show active first, then most recent
        const active = all.filter(s => s.status === 'Active')
        const rest = all.filter(s => s.status !== 'Active')
        setSubscriptions([...active, ...rest])
      } catch {
        setError('Failed to load subscriptions. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchSubs()
  }, [])

  if (loading) return <PageLoader />
  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>
  if (!subscriptions.length) return <div style={{ padding: 20, textAlign: 'center' }}>No subscriptions found.</div>

  const activeSubs = subscriptions.filter(s => s.status === 'Active')
  const sub = subscriptions[selected]

  const completed = sub.completedDays || 0
  const total = sub.totalDays || 30
  const skipped = sub.skippedDays || 0
  const remaining = Math.max(0, total - completed - skipped)
  const pct = total > 0 ? (completed / total) * 100 : 0
  const circumference = 2 * Math.PI * 54

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(sub.endDate)
  endDate.setHours(0, 0, 0, 0)
  const isExpired = remaining <= 0 || endDate.getTime() < today.getTime() || sub.status === 'Expired'

  return (
    <div style={{ padding: '0 20px', paddingBottom: 120 }}>
      {/* Header */}
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8" style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', outline: 'none' }}>
          <ArrowLeft size={20} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>
            My Subscriptions
          </span>
        </button>
      </div>

      {/* Plan selector pills — only when multiple active plans */}
      {activeSubs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
          {activeSubs.map((s, i) => {
            const idx = subscriptions.indexOf(s)
            const isActive = selected === idx
            return (
              <button
                key={s._id}
                onClick={() => { setSelected(idx); setShowCancel(false) }}
                style={{
                  flexShrink: 0,
                  padding: '8px 16px',
                  borderRadius: 100,
                  border: isActive ? 'none' : '1px solid var(--border-glass)',
                  background: isActive ? 'var(--accent-lime)' : 'var(--bg-glass)',
                  color: isActive ? '#000' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap'
                }}
              >
                <Car size={13} />
                {s.vehicle?.brand} {s.vehicle?.model}
              </button>
            )
          })}
        </div>
      )}

      {/* Content for selected subscription */}
      {isExpired ? (
        <div className="glass animate-fade-in-up overflow-hidden relative" style={{ marginTop: 8, padding: '48px 24px', textAlign: 'center', borderRadius: 32, border: '1px solid rgba(255, 85, 85, 0.3)' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'var(--error)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: 'var(--primary-blue)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: 80, height: 80, borderRadius: 28, background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Clock size={36} color="#ff5555" />
            </div>
            <div className="text-label mb-8" style={{ color: '#ff5555', letterSpacing: '0.05em' }}>PLAN EXPIRED</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
              Your {sub.package?.name || 'Subscription'} has ended
            </h2>
            <p className="text-secondary text-body-sm mb-32 leading-relaxed" style={{ maxWidth: 300, margin: '0 auto 32px' }}>
              Your plan for the {sub.vehicle?.brand} {sub.vehicle?.model} ran from{' '}
              {new Date(sub.startDate).toLocaleDateString()} to {new Date(sub.endDate).toLocaleDateString()}.
            </p>
            <Link to="/customer/packages" className="btn btn-primary w-full shadow-lg" style={{ borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              Renew Subscription
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Circular progress */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 32px' }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-glass)" strokeWidth="6" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent-lime)" strokeWidth="6"
                  strokeDasharray={circumference} strokeDashoffset={circumference - (pct / 100) * circumference}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s var(--ease-out)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--accent-lime)' }}>{remaining}</span>
                <span className="text-body-sm text-secondary">days left</span>
              </div>
            </div>
          </div>

          {/* Plan info card */}
          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                {sub.package?.name || 'Subscription'}
              </span>
              <span className="chip chip-lime">{sub.status}</span>
            </div>
            <div className="flex flex-col gap-12">
              {[
                { label: 'Vehicle', value: `${sub.vehicle?.brand || ''} ${sub.vehicle?.model || ''}`.trim() || 'Unknown' },
                { label: 'Plate', value: sub.vehicle?.number || '' },
                { label: 'Society', value: sub.society?.name || '—' },
                { label: 'Time Slot', value: sub.slot || '—' },
                { label: 'Duration', value: `${new Date(sub.startDate).toLocaleDateString()} → ${new Date(sub.endDate).toLocaleDateString()}` },
                { label: 'Next Service', value: sub.nextWash ? new Date(sub.nextWash).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—' },
                { label: 'Completed', value: `${completed} days cleaned` },
                { label: 'Skipped', value: `${skipped} days` },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-body-sm">
                  <span className="text-secondary">{r.label}</span>
                  <span style={{ fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid-3" style={{ gap: 10, marginBottom: 20 }}>
            {[
              { icon: Calendar, value: completed, label: 'Done', color: 'var(--success)' },
              { icon: SkipForward, value: skipped, label: 'Skipped', color: 'var(--warning)' },
              { icon: Clock, value: remaining, label: 'Left', color: 'var(--accent-lime)' },
            ].map((s, i) => (
              <div key={i} className="glass" style={{ padding: 16, textAlign: 'center' }}>
                <s.icon size={20} style={{ color: s.color, margin: '0 auto 8px' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{s.value}</div>
                <div className="text-body-sm text-secondary">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-8">
            <div className="flex gap-8">
              {remaining > 0 && (
                <Link to="/customer/skip" className="btn btn-ghost" style={{ flex: 1 }}>Skip Day</Link>
              )}
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => navigate(`/customer/packages?vehicleId=${sub.vehicle?._id}&extend=true`)}
              >
                <TrendingUp size={16} /> Extend
              </button>
            </div>
            <Link to={`/customer/packages?vehicleId=${sub.vehicle?._id}&upgrade=true`} className="btn glass w-full" style={{ border: '1px dashed var(--border-glass)' }}>
              Upgrade Plan
            </Link>
            <button
              className="btn btn-ghost w-full"
              style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => setShowCancel(true)}
            >
              <XCircle size={16} /> Cancel Plan
            </button>
          </div>

          {/* Add another vehicle CTA */}
          <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 20, background: 'var(--bg-glass)', border: '1px dashed var(--border-glass)', textAlign: 'center' }}>
            <p className="text-secondary text-body-sm" style={{ marginBottom: 10 }}>Have another vehicle?</p>
            <Link to="/customer/packages" className="btn btn-glass btn-sm" style={{ fontSize: 13, fontWeight: 700 }}>
              + Add New Plan
            </Link>
          </div>
        </>
      )}

      {/* Cancel Plan modal */}
      {showCancel && (
        <div
          onClick={() => setShowCancel(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass animate-fade-in-up"
            style={{ maxWidth: 360, width: '100%', borderRadius: 24, padding: 28, position: 'relative' }}
          >
            <button
              onClick={() => setShowCancel(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
            >
              <X size={20} />
            </button>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,85,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <PhoneCall size={26} color="#ff5555" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Cancel Subscription</h3>
            <p className="text-secondary text-body-sm" style={{ lineHeight: 1.6, marginBottom: 24 }}>
              To cancel your plan, please contact our customer care team. Reach out using the details below.
            </p>
            <div className="flex flex-col gap-12">
              <a href={`tel:${(support.phone || '').replace(/\s/g, '')}`} className="btn btn-primary w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <PhoneCall size={18} /> Call {support.phone}
              </a>
              <a href={`mailto:${support.email}`} className="btn glass w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid var(--border-glass)' }}>
                <Mail size={18} /> Email {support.email}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

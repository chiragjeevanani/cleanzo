import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, SkipForward, Clock, TrendingUp } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function SubscriptionDetail() {
  const navigate = useNavigate();

  const { showToast } = useToast()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await apiClient.get('/customer/subscriptions')
        const active = (res.subscriptions || []).find(s => s.status === 'Active') || res.subscriptions?.[0] || null
        if (active) setSubscription(active)
      } catch (err) {
        setError('Failed to load subscription. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchSub()
  }, [])

  if (loading) return <PageLoader />
  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>
  if (!subscription) return <div style={{ padding: 20, textAlign: 'center' }}>No active subscription found.</div>

  const completed = subscription.completedDays || 0
  const total = subscription.totalDays || 30
  const skipped = subscription.skippedDays || 0
  const remaining = Math.max(0, total - completed - skipped)
  const pct = total > 0 ? (completed / total) * 100 : 0
  const circumference = 2 * Math.PI * 54

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(subscription.endDate);
  endDate.setHours(0, 0, 0, 0);
  const isExpired = remaining <= 0 || endDate.getTime() < today.getTime() || subscription.status === 'Expired';

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)}  className="flex items-center gap-8" style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', outline: 'none' }}><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Subscription</span></button>
      </div>

      {isExpired ? (
        <div className="glass animate-fade-in-up overflow-hidden relative" style={{ marginTop: 24, padding: '48px 24px', textAlign: 'center', borderRadius: 32, border: '1px solid rgba(255, 85, 85, 0.3)' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'var(--error)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: 'var(--primary-blue)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: 80, height: 80, borderRadius: 28, background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Clock size={36} color="#ff5555" />
            </div>
            
            <div className="text-label mb-8" style={{ color: '#ff5555', letterSpacing: '0.05em' }}>
              PLAN EXPIRED
            </div>
            
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
              Your {subscription.package?.name || 'Subscription'} has ended
            </h2>
            
            <p className="text-secondary text-body-sm mb-32 leading-relaxed" style={{ maxWidth: 300, margin: '0 auto 32px' }}>
              Your plan for the {subscription.vehicle?.brand} {subscription.vehicle?.model} ran from {new Date(subscription.startDate).toLocaleDateString()} to {new Date(subscription.endDate).toLocaleDateString()}. Thank you for choosing us!
            </p>
            
            <Link to="/customer/packages" className="btn btn-primary w-full shadow-lg" style={{ borderRadius: 16, padding: '18px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <span>Renew Subscription</span>
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

          <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{subscription.package?.name || 'Subscription'}</span>
              <span className="chip chip-lime">{subscription.status}</span>
            </div>
            <div className="flex flex-col gap-12">
              {[
                { label: 'Vehicle', value: `${subscription.vehicle?.model || 'Unknown'}` },
                { label: 'Plate', value: subscription.vehicle?.number || '' },
                { label: 'Duration', value: `${new Date(subscription.startDate).toLocaleDateString()} → ${new Date(subscription.endDate).toLocaleDateString()}` },
                { label: 'Next Service', value: subscription.nextWash ? new Date(subscription.nextWash).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—' },
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

          <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
            <div className="flex gap-8">
              {remaining > 0 && <Link to="/customer/skip" className="btn btn-ghost" style={{ flex: 1 }}>Skip Day</Link>}
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/customer/packages?vehicleId=${subscription.vehicle?._id}&extend=true`)}><TrendingUp size={16} /> Extend</button>
            </div>
            <Link to="/customer/packages" className="btn glass w-full" style={{ border: '1px dashed var(--border-glass)' }}>
              Upgrade or Change Plan
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

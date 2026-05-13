import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, Calendar, SkipForward, Clock, Car, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'

export default function CustomerHome() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [history, setHistory] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, histRes, notifRes] = await Promise.all([
          apiClient.get('/customer/subscriptions'),
          apiClient.get('/customer/history?limit=3'),
          apiClient.get('/customer/notifications'),
        ])
        const activeSub = (subsRes.subscriptions || []).find(s => s.status === 'Active') || null
        setSubscription(activeSub)
        setHistory(histRes.tasks || [])
        setUnreadCount((notifRes.notifications || []).filter(n => !n.read).length)
      } catch (err) {
        setError('Failed to load data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  if (loading) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
        <div>
          <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 150, height: 28, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0 }} />
      </div>
      <div className="container">
        <div className="skeleton" style={{ height: 188, borderRadius: 32, marginBottom: 32 }} />
        <div style={{ marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6, marginBottom: 16, marginLeft: 8 }} />
          <div className="grid-3" style={{ gap: 14 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 24 }} />)}
          </div>
        </div>
        <div>
          <div className="flex justify-between" style={{ marginBottom: 16, padding: '0 8px' }}>
            <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 52, height: 11, borderRadius: 6 }} />
          </div>
          <div className="flex flex-col gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20 }}>
                <div className="flex items-center gap-14">
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                  <div>
                    <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 6, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: 88, height: 12, borderRadius: 6 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 8, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (error) return <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--error)' }}>{error}</div>

  return (
    <div className="app-shell animate-fade-in">
      {/* Header */}
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
        <div>
          <div className="text-body-sm text-secondary font-medium">{greeting},</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>{user?.name?.split(' ')[0] || 'User'} 👋</h1>
        </div>
        <Link to="/customer/notifications" className="relative">
          <div className="glass flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16 }}>
            <Bell size={20} className="text-secondary" />
          </div>
          {unreadCount > 0 && (
            <div style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: 'var(--error)', border: '2px solid var(--bg-primary)' }} />
          )}
        </Link>
      </div>

      <div className="container">
        {/* Active Subscription Card */}
        {subscription ? (
          <Link to="/customer/subscriptions" className="premium-gradient animate-fade-in-up" 
            style={{ 
              display: 'block', padding: 32, marginBottom: 32, borderRadius: 32,
              border: '1px solid var(--border-accent)',
              boxShadow: 'var(--shadow-glow-lime)',
              position: 'relative',
              overflow: 'hidden'
            }}>
            
            <div style={{ position: 'absolute', top: 0, right: 0, padding: 12 }}>
               <span className="chip chip-lime" style={{ fontSize: 10, fontWeight: 800, borderRadius: 8 }}>{subscription.status.toUpperCase()}</span>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="text-label" style={{ color: 'var(--accent-lime)', marginBottom: 8, fontSize: 10, letterSpacing: '0.15em' }}>CURRENT SUBSCRIPTION</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
                {subscription.package?.name || 'Cleaning Plan'}
              </h2>
              <p className="text-secondary font-medium" style={{ fontSize: 15 }}>
                {subscription.vehicle?.model} <span style={{ opacity: 0.5 }}>•</span> {subscription.vehicle?.number}
              </p>

              <div className="flex justify-between items-end" style={{ marginTop: 28, marginBottom: 12 }}>
                <div>
                  <span className="text-secondary text-body-sm font-semibold">Service Progress</span>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: 2 }}>
                    {subscription.completedDays} <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>/ {subscription.totalDays} washes</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div className="text-label" style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>NEXT WASH</div>
                   <div style={{ fontWeight: 700, fontSize: 14 }}>
                     {subscription.nextWash ? new Date(subscription.nextWash).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                   </div>
                </div>
              </div>

              <div className="progress-track" style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                <div className="progress-fill" style={{ width: `${subscription.totalDays > 0 ? (subscription.completedDays / subscription.totalDays) * 100 : 0}%`, borderRadius: 3, boxShadow: '0 0 12px var(--accent-lime)' }} />
              </div>
            </div>
          </Link>
        ) : (
          <div className="glass animate-fade-in-up" style={{ padding: 40, marginBottom: 32, textAlign: 'center', borderRadius: 32 }}>
            <div style={{ width: 64, height: 64, background: 'rgba(223, 255, 0, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Calendar size={32} color="var(--accent-lime)" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ready for a clean car?</h3>
            <p className="text-secondary text-body-sm mb-24">Subscribe to a plan and keep your vehicle shiny every day.</p>
            <Link to="/customer/packages" className="btn btn-primary w-full" style={{ borderRadius: 16, padding: 18 }}>Explore Packages</Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="animate-fade-in-up delay-1" style={{ marginBottom: 40 }}>
          <div className="text-label" style={{ marginBottom: 16, color: 'var(--text-tertiary)', paddingLeft: 8 }}>Quick Services</div>
          <div className="grid-3" style={{ gap: 14 }}>
            {[
              { icon: Calendar, label: 'New Booking', to: '/customer/booking', color: 'var(--accent-lime)', bg: 'rgba(223,255,0,0.1)' },
              { icon: SkipForward, label: 'Skip Today', to: '/customer/skip', color: 'var(--primary-blue)', bg: 'rgba(0,122,255,0.1)' },
              { icon: Car, label: 'My Garage', to: '/customer/vehicles', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' },
            ].map((a, i) => (
              <Link key={i} to={a.to} className="glass" style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderRadius: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <a.icon size={24} style={{ color: a.color }} />
                </div>
                <span className="text-body-sm" style={{ fontWeight: 700 }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Washes */}
        <div className="animate-fade-in-up delay-2" style={{ marginBottom: 40 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16, padding: '0 8px' }}>
            <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>Recent Service</span>
            <Link to="/customer/history" className="text-body-sm font-bold" style={{ color: 'var(--primary-blue)' }}>View All</Link>
          </div>
          <div className="flex flex-col gap-10">
            {history.length > 0 ? history.map(s => (
              <div key={s._id} className="glass" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20 }}>
                <div className="flex items-center gap-14">
                  <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={20} color={s.status === 'completed' ? 'var(--success)' : 'var(--text-tertiary)'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.packageName || 'Cleaning Service'}</div>
                    <div className="text-body-sm text-secondary font-medium">
                      {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <span style={{ opacity: 0.3 }}>•</span> {s.scheduledTime || s.completedTime || ''}
                    </div>
                  </div>
                </div>
                <span className={`chip ${s.status === 'completed' ? 'chip-success' : s.status === 'skipped' ? 'chip-ghost' : 'chip-error'}`} style={{ borderRadius: 8, fontSize: 9 }}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            )) : (
              <div className="glass text-center text-secondary text-body-sm py-32" style={{ borderRadius: 20 }}>
                No recent service history yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

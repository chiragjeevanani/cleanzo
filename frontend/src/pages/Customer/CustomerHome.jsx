import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, Calendar, SkipForward, Clock, Car } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'

export default function CustomerHome() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, histRes] = await Promise.all([
          apiClient.get('/customer/subscriptions'),
          apiClient.get('/customer/history?limit=3')
        ])
        setSubscription(subsRes.subscriptions[0]) // Get the first active sub
        setHistory(histRes.tasks || [])
      } catch (err) {
        console.error('Error fetching home data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div className="app-header" style={{ padding: '16px 0' }}>
        <div>
          <div className="text-body-sm text-secondary">{greeting}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{user?.name?.split(' ')[0] || 'User'} 👋</div>
        </div>
        <Link to="/customer/notifications" style={{ position: 'relative' }}>
          <div className="theme-toggle"><Bell size={18} /></div>
          <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--error)' }} />
        </Link>
      </div>

      {/* Ad Banner Container (Invisible until ad is injected) */}
      <div id="ad-banner-container" className="reveal" />

      {/* Active Subscription Card */}
      {subscription ? (
        <Link to="/customer/subscriptions" className="glass" style={{ display: 'block', padding: 24, marginBottom: 20 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
            <span className="text-label text-lime">Active Plan</span>
            <span className="chip chip-lime">{subscription.status}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {subscription.package?.name || 'Subscription'}
          </div>
          <div className="text-body-sm text-secondary" style={{ marginBottom: 4 }}>
            {subscription.vehicle?.model} · {subscription.vehicle?.number}
          </div>
          <div className="flex justify-between items-center text-body-sm" style={{ marginBottom: 8, marginTop: 16 }}>
            <span className="text-secondary">Progress</span>
            <span style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>
              {subscription.completedDays}/{subscription.totalDays} days
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(subscription.completedDays / subscription.totalDays) * 100}%` }} />
          </div>
          <div className="flex justify-between items-center text-body-sm text-secondary" style={{ marginTop: 10 }}>
            <span>Next cleaning: {new Date(subscription.nextWash).toLocaleDateString()}</span>
            <ChevronRight size={16} />
          </div>
        </Link>
      ) : (
        <div className="glass" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>You don't have an active plan yet.</div>
          <Link to="/customer/packages" className="btn btn-primary">Browse Plans</Link>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: 28 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 12 }}>Quick Actions</div>
        <div className="grid-3" style={{ gap: 10 }}>
          {[
            { icon: Calendar, label: 'Book', to: '/customer/booking', color: 'var(--accent-lime)' },
            { icon: SkipForward, label: 'Skip Day', to: '/customer/skip', color: 'var(--primary-blue)' },
            { icon: Car, label: 'Vehicles', to: '/customer/vehicles', color: 'var(--text-secondary)' },
          ].map((a, i) => (
            <Link key={i} to={a.to} className="glass" style={{ padding: '18px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <a.icon size={24} style={{ color: a.color }} />
              <span className="text-body-sm" style={{ fontWeight: 500 }}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Washes */}
      <div style={{ marginBottom: 100 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
          <span className="text-label text-secondary">Recent Service</span>
          <Link to="/customer/history" className="text-body-sm" style={{ color: 'var(--primary-blue)' }}>View All</Link>
        </div>
        <div className="flex flex-col gap-8">
          {history.length > 0 ? history.map(s => (
            <div key={s._id} className="glass" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-body-sm" style={{ fontWeight: 500 }}>{s.packageName || 'Cleaning Service'}</div>
                <div className="text-body-sm text-secondary">{new Date(s.date).toLocaleDateString()} · {s.scheduledTime || s.completedTime || ''}</div>
              </div>
              <span className={`chip ${s.status === 'completed' ? 'chip-success' : s.status === 'skipped' ? 'chip-ghost' : 'chip-error'}`}>
                {s.status}
              </span>
            </div>
          )) : (
            <div className="text-center text-secondary text-body-sm py-4">No recent services</div>
          )}
        </div>
      </div>
    </div>
  )
}

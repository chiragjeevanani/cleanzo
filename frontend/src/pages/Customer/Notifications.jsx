import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, CreditCard, Gift } from 'lucide-react'
import apiClient from '../../services/apiClient'

const iconMap = { service: Bell, subscription: CreditCard, offer: Gift }

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/customer/notifications')
        setNotifications(res.notifications || [])
      } catch (err) {
        setError('Failed to load notifications.')
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await apiClient.put(`/customer/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    } catch {
      // non-critical — silently ignore
    }
  }

  if (loading) return <PageLoader />
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Notifications</span></Link>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {notifications.length === 0 ? (
          <div className="text-center text-secondary py-8">No notifications found.</div>
        ) : notifications.map(n => {
          const Icon = iconMap[n.type] || Bell
          return (
            <div
              key={n._id}
              className="glass"
              style={{ padding: '16px 20px', display: 'flex', gap: 14, opacity: n.read ? 0.6 : 1, cursor: n.read ? 'default' : 'pointer' }}
              onClick={() => !n.read && handleMarkRead(n._id)}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color: n.type === 'offer' ? 'var(--accent-lime)' : 'var(--primary-blue)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                  {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-blue)', flexShrink: 0 }} />}
                </div>
                <div className="text-body-sm text-secondary">{n.message}</div>
                <div className="text-body-sm text-tertiary" style={{ marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

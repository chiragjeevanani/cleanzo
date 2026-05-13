import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Bell, Send, Users, UserCog, Globe, X, ChevronDown } from 'lucide-react'
import apiClient from '../../services/apiClient'

const TYPE_OPTIONS = ['system', 'promo', 'reminder', 'alert']
const TARGET_OPTIONS = [
  { value: 'all', label: 'Everyone', icon: Globe },
  { value: 'customers', label: 'Customers only', icon: Users },
  { value: 'cleaners', label: 'Cleaners only', icon: UserCog },
]

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [sending, setSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({ title: '', message: '', type: 'system', target: 'all' })

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/admin/notifications')
      setNotifications(res.notifications || [])
    } catch {
      setError('Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications() }, [])

  const handleBroadcast = async (e) => {
    e.preventDefault()
    setSending(true)
    setBroadcastResult('')
    try {
      const res = await apiClient.post('/admin/notifications/broadcast', form)
      setBroadcastResult(res.message || 'Notification sent!')
      setForm({ title: '', message: '', type: 'system', target: 'all' })
      fetchNotifications()
    } catch (err) {
      setBroadcastResult(err?.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  const typeColor = (type) => ({
    system: 'chip-ghost',
    promo: 'chip-lime',
    reminder: 'chip-success',
    alert: 'chip-error',
  }[type] || 'chip-ghost')

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Notifications</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Broadcast messages and view notification history</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowBroadcast(true); setBroadcastResult('') }}>
          <Send size={15} /> Broadcast
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Notification History */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            Notification History
          </span>
          <span className="text-secondary" style={{ fontSize: 13, marginLeft: 8 }}>({notifications.length} total)</span>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Message</th><th>Type</th><th>Recipient</th><th>Sent</th></tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '48px 0' }}>
                  <Bell size={32} style={{ opacity: 0.2, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  <div className="text-secondary">No notifications sent yet.</div>
                </td>
              </tr>
            ) : notifications.map(n => {
              const recipientName = n.recipient
                ? (n.recipient.firstName ? `${n.recipient.firstName} ${n.recipient.lastName || ''}` : n.recipient.name || n.recipient.phone || 'Unknown')
                : '—'
              return (
                <tr key={n._id}>
                  <td style={{ fontWeight: 500 }}>{n.title}</td>
                  <td className="text-secondary" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</td>
                  <td><span className={`chip ${typeColor(n.type)}`} style={{ textTransform: 'capitalize' }}>{n.type}</span></td>
                  <td className="text-secondary" style={{ fontSize: 13 }}>{recipientName}</td>
                  <td className="text-secondary" style={{ fontSize: 13 }}>{new Date(n.createdAt).toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 540, padding: '48px 56px', borderRadius: 36,
            border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 200, height: 200, background: 'var(--primary-blue)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />

            <div className="flex justify-between items-start" style={{ marginBottom: 36 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Broadcast</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Send a push notification to users</p>
              </div>
              <button className="glass flex items-center justify-center" onClick={() => { setShowBroadcast(false); setBroadcastResult('') }}
                style={{ width: 40, height: 40, borderRadius: 14 }}>
                <X size={18} />
              </button>
            </div>

            {broadcastResult && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(100,220,100,0.08)', border: '1px solid rgba(100,220,100,0.2)', color: 'var(--success)', marginBottom: 20, fontSize: 14 }}>
                {broadcastResult}
              </div>
            )}

            <form onSubmit={handleBroadcast} className="flex flex-col gap-20">
              {/* Target Audience */}
              <div className="flex flex-col gap-10">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>TARGET AUDIENCE</label>
                <div className="flex gap-10">
                  {TARGET_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm({ ...form, target: opt.value })}
                      className={`flex flex-col items-center gap-6 ${form.target === opt.value ? 'btn btn-primary' : 'btn btn-glass'}`}
                      style={{ flex: 1, padding: '12px 8px', borderRadius: 16, fontSize: 12 }}>
                      <opt.icon size={18} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>NOTIFICATION TYPE</label>
                <div className="flex gap-8 flex-wrap">
                  {TYPE_OPTIONS.map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`chip ${form.type === t ? typeColor(t) : 'chip-ghost'}`}
                      style={{ cursor: 'pointer', textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>TITLE *</label>
                <input required className="input-field" placeholder="e.g. New Offer!" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>MESSAGE *</label>
                <textarea required className="input-field" placeholder="Write your notification message here..."
                  rows={4} style={{ resize: 'none', lineHeight: '1.6' }}
                  value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>

              <button disabled={sending} className="btn btn-primary w-full" type="submit"
                style={{ padding: '16px', borderRadius: 20, fontSize: 16, fontWeight: 700 }}>
                <Send size={16} /> {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

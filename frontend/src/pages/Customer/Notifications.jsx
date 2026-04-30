import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, CreditCard, Gift } from 'lucide-react'
import { mockNotifications } from '../../data/mockData'

const iconMap = { service: Bell, subscription: CreditCard, offer: Gift }

export default function Notifications() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Notifications</span></Link>
      </div>
      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {mockNotifications.map(n => {
          const Icon = iconMap[n.type] || Bell
          return (
            <div key={n.id} className="glass" style={{ padding: '16px 20px', display: 'flex', gap: 14, opacity: n.read ? 0.6 : 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} style={{ color: n.type === 'offer' ? 'var(--accent-lime)' : 'var(--primary-blue)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                  {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-blue)' }} />}
                </div>
                <div className="text-body-sm text-secondary">{n.message}</div>
                <div className="text-body-sm text-tertiary" style={{ marginTop: 4 }}>{n.time}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

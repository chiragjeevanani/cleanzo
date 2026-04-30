import { Link } from 'react-router-dom'
import { Bell, ChevronRight, Calendar, SkipForward, Clock, Car } from 'lucide-react'
import { mockUser, mockSubscription, mockServiceHistory } from '../../data/mockData'

export default function CustomerHome() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div className="app-header" style={{ padding: '16px 0' }}>
        <div>
          <div className="text-body-sm text-secondary">{greeting}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{mockUser.name.split(' ')[0]} 👋</div>
        </div>
        <Link to="/customer/notifications" style={{ position: 'relative' }}>
          <div className="theme-toggle"><Bell size={18} /></div>
          <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--error)' }} />
        </Link>
      </div>

      {/* Active Subscription Card */}
      <Link to="/customer/subscriptions" className="glass" style={{ display: 'block', padding: 24, marginBottom: 20 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <span className="text-label text-lime">Active Plan</span>
          <span className="chip chip-lime">Active</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {mockSubscription.package.name}
        </div>
        <div className="text-body-sm text-secondary" style={{ marginBottom: 4 }}>
          {mockSubscription.vehicle.model} · {mockSubscription.vehicle.number}
        </div>
        <div className="flex justify-between items-center text-body-sm" style={{ marginBottom: 8, marginTop: 16 }}>
          <span className="text-secondary">Progress</span>
          <span style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>
            {mockSubscription.completedDays}/{mockSubscription.totalDays} days
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(mockSubscription.completedDays / mockSubscription.totalDays) * 100}%` }} />
        </div>
        <div className="flex justify-between items-center text-body-sm text-secondary" style={{ marginTop: 10 }}>
          <span>Next wash: Tomorrow, 7:00 AM</span>
          <ChevronRight size={16} />
        </div>
      </Link>

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
          <span className="text-label text-secondary">Recent Washes</span>
          <Link to="/customer/history" className="text-body-sm" style={{ color: 'var(--primary-blue)' }}>View All</Link>
        </div>
        <div className="flex flex-col gap-8">
          {mockServiceHistory.slice(0, 3).map(s => (
            <div key={s.id} className="glass" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="text-body-sm" style={{ fontWeight: 500 }}>{s.service}</div>
                <div className="text-body-sm text-secondary">{s.date} · {s.time}</div>
              </div>
              <span className={`chip ${s.status === 'Completed' ? 'chip-success' : s.status === 'Skipped' ? 'chip-ghost' : 'chip-error'}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

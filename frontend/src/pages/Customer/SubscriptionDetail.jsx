import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, SkipForward, Clock, TrendingUp } from 'lucide-react'
import { mockSubscription } from '../../data/mockData'

export default function SubscriptionDetail() {
  const pct = (mockSubscription.completedDays / mockSubscription.totalDays) * 100
  const circumference = 2 * Math.PI * 54

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Subscription</span></Link>
      </div>

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
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--accent-lime)' }}>{mockSubscription.remainingDays}</span>
            <span className="text-body-sm text-secondary">days left</span>
          </div>
        </div>
      </div>

      <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{mockSubscription.package.name}</span>
          <span className="chip chip-lime">Active</span>
        </div>
        <div className="flex flex-col gap-12">
          {[
            { label: 'Vehicle', value: `${mockSubscription.vehicle.model}` },
            { label: 'Plate', value: mockSubscription.vehicle.number },
            { label: 'Duration', value: `${mockSubscription.startDate} → ${mockSubscription.endDate}` },
            { label: 'Completed', value: `${mockSubscription.completedDays} days cleaned` },
            { label: 'Skipped', value: `${mockSubscription.skippedDays} days` },
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
          { icon: Calendar, value: mockSubscription.completedDays, label: 'Done', color: 'var(--success)' },
          { icon: SkipForward, value: mockSubscription.skippedDays, label: 'Skipped', color: 'var(--warning)' },
          { icon: Clock, value: mockSubscription.remainingDays, label: 'Left', color: 'var(--accent-lime)' },
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
          <Link to="/customer/skip" className="btn btn-ghost" style={{ flex: 1 }}>Skip Day</Link>
          <button className="btn btn-primary" style={{ flex: 1 }}><TrendingUp size={16} /> Extend</button>
        </div>
        <Link to="/customer/packages" className="btn glass w-full" style={{ border: '1px dashed var(--border-glass)' }}>
          Upgrade or Change Plan
        </Link>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { mockCleaner, mockTasks } from '../../data/mockData'

export default function CleanerDashboard() {
  const pending = mockTasks.filter(t => t.status === 'pending').length
  const inProgress = mockTasks.filter(t => t.status === 'in-progress').length
  const completed = mockTasks.filter(t => t.status === 'completed').length

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div style={{ padding: '20px 0' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-body-sm text-secondary">Welcome back</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{mockCleaner.name}</div>
          </div>
          <div className="chip chip-lime"><Award size={12} /> {mockCleaner.rank}</div>
        </div>
      </div>

      {/* Today's count */}
      <div className="glass" style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 8 }}>Today's Tasks</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 900, color: 'var(--accent-lime)', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {mockTasks.length}
        </div>
        <div className="text-body-sm text-secondary" style={{ marginTop: 8 }}>vehicles assigned</div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 24 }}>
        {[
          { icon: AlertCircle, value: pending, label: 'Pending', color: 'var(--warning)' },
          { icon: Clock, value: inProgress, label: 'In Progress', color: 'var(--primary-blue)' },
          { icon: CheckCircle2, value: completed, label: 'Done', color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="glass" style={{ padding: 16, textAlign: 'center' }}>
            <s.icon size={18} style={{ color: s.color, margin: '0 auto 6px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            <div className="text-body-sm text-secondary" style={{ fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Performance */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 14 }}>Performance</div>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <span className="text-body-sm text-secondary">Completion Rate</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{mockCleaner.completionRate}%</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${mockCleaner.completionRate}%`, background: 'var(--success)' }} /></div>
        <div className="flex justify-between text-body-sm text-secondary" style={{ marginTop: 14 }}>
          <span>Rating: ★ {mockCleaner.rating}</span>
          <span>{mockCleaner.totalCompleted.toLocaleString()} total</span>
        </div>
      </div>

      {/* Quick start */}
      <Link to="/cleaner/tasks" className="btn btn-primary w-full btn-lg" style={{ marginBottom: 100 }}>
        Start Tasks <ArrowRight size={18} />
      </Link>
    </div>
  )
}

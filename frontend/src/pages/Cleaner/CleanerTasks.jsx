import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, ChevronRight } from 'lucide-react'
import { mockTasks } from '../../data/mockData'

const statusColors = { pending: 'var(--warning)', 'in-progress': 'var(--primary-blue)', completed: 'var(--success)' }
const statusLabels = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' }

export default function CleanerTasks() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? mockTasks : mockTasks.filter(t => t.status === filter)

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner" className="flex items-center gap-8"><ArrowLeft size={20} /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Today's Tasks</span>
        <div style={{ width: 20 }} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-8" style={{ marginBottom: 20, overflowX: 'auto' }}>
        {['all', 'pending', 'in-progress', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`chip ${filter === f ? 'chip-lime' : 'chip-ghost'}`}
            style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {f === 'all' ? 'All' : statusLabels[f]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {filtered.map(t => (
          <Link key={t.id} to={`/cleaner/tasks/${t.id}`} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 4, height: 48, borderRadius: 2, background: statusColors[t.status], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t.car}</span>
                <span className="chip" style={{ background: `${statusColors[t.status]}20`, color: statusColors[t.status], fontSize: 10 }}>
                  {statusLabels[t.status]}
                </span>
              </div>
              <div className="text-body-sm text-secondary">{t.plate} · {t.package}</div>
              <div className="flex items-center gap-12 text-body-sm text-tertiary" style={{ marginTop: 6 }}>
                <span className="flex items-center gap-4"><MapPin size={12} /> {t.location}</span>
                <span className="flex items-center gap-4"><Clock size={12} /> {t.time}</span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, User, Package, Camera, CheckCircle2 } from 'lucide-react'
import { mockTasks } from '../../data/mockData'

export default function TaskDetail() {
  const { id } = useParams()
  const task = mockTasks.find(t => t.id === Number(id)) || mockTasks[0]
  const [status, setStatus] = useState(task.status)

  const statusFlow = { pending: 'in-progress', 'in-progress': 'completed' }
  const btnLabels = { pending: 'Start Cleaning', 'in-progress': 'Mark Complete', completed: 'Completed' }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner/tasks" className="flex items-center gap-8"><ArrowLeft size={20} /></Link>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Task Detail</span>
        <div style={{ width: 20 }} />
      </div>

      {/* Car Info */}
      <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{task.car}</div>
        <div className="text-body-sm" style={{ color: 'var(--accent-lime)', fontWeight: 600, marginBottom: 16 }}>{task.plate}</div>
        <div className="flex flex-col gap-12">
          {[
            { icon: User, label: 'Customer', value: task.customer },
            { icon: Package, label: 'Package', value: task.package },
            { icon: MapPin, label: 'Location', value: task.location },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-12">
              <r.icon size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span className="text-body-sm text-secondary">{r.label}:</span>
              <span className="text-body-sm" style={{ fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Photo upload */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 12 }}>Service Photos</div>
        <div className="grid-2" style={{ gap: 10 }}>
          {['Before', 'After'].map((label, i) => (
            <Link key={i} to="/cleaner/upload" className="glass" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderStyle: 'dashed' }}>
              <Camera size={24} style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-body-sm text-secondary">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Status action */}
      <div style={{ paddingBottom: 100 }}>
        {status !== 'completed' ? (
          <button className="btn btn-primary w-full btn-lg" onClick={() => setStatus(statusFlow[status] || status)}>
            {btnLabels[status]}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-8" style={{ padding: 20, color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Task Completed</span>
          </div>
        )}
      </div>
    </div>
  )
}

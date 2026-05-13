import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Clock, AlertCircle, ArrowRight, IndianRupee, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'

export default function CleanerDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/cleaner/tasks')
        setTasks(res.tasks || [])
      } catch (err) {
        setError('Failed to load tasks.')
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const pending = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const completed = tasks.filter(t => t.status === 'completed').length

  if (loading) return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div style={{ padding: '20px 0' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 6, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 140, height: 22, borderRadius: 8 }} />
          </div>
          <div className="skeleton" style={{ width: 72, height: 26, borderRadius: 20 }} />
        </div>
      </div>
      {/* Big count card */}
      <div className="glass" style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 100, height: 11, borderRadius: 6, margin: '0 auto 12px' }} />
        <div className="skeleton" style={{ width: 80, height: 64, borderRadius: 12, margin: '0 auto 10px' }} />
        <div className="skeleton" style={{ width: 120, height: 12, borderRadius: 6, margin: '0 auto' }} />
      </div>
      {/* Stats grid */}
      <div className="grid-3" style={{ gap: 10, marginBottom: 24 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass" style={{ padding: 16, textAlign: 'center' }}>
            <div className="skeleton" style={{ width: 18, height: 18, borderRadius: '50%', margin: '0 auto 8px' }} />
            <div className="skeleton" style={{ width: 32, height: 24, borderRadius: 6, margin: '0 auto 6px' }} />
            <div className="skeleton" style={{ width: 56, height: 11, borderRadius: 6, margin: '0 auto' }} />
          </div>
        ))}
      </div>
      {/* Operations grid */}
      <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
        {[1, 2].map(i => (
          <div key={i} className="glass" style={{ padding: 20 }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 10 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} />
            </div>
            <div className="skeleton" style={{ width: 60, height: 11, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 100, height: 18, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      {/* Performance card */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 90, height: 11, borderRadius: 6, marginBottom: 16 }} />
        <div className="flex justify-between" style={{ marginBottom: 8 }}>
          <div className="skeleton" style={{ width: 110, height: 13, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 36, height: 13, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: '100%', height: 6, borderRadius: 3, marginBottom: 14 }} />
        <div className="flex justify-between">
          <div className="skeleton" style={{ width: 80, height: 13, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 100, height: 13, borderRadius: 6 }} />
        </div>
      </div>
      {/* CTA button */}
      <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 'var(--radius)', marginBottom: 100 }} />
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', margin: '12px 0', fontSize: 14 }}>
          {error}
        </div>
      )}
      {/* Header */}
      <div style={{ padding: '20px 0' }}>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-body-sm text-secondary">Welcome back</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{user?.name || 'Cleaner'}</div>
          </div>
          <div className="chip chip-lime"><Award size={12} /> {user?.role || 'Cleaner'}</div>
        </div>
      </div>

      {/* Today's count */}
      <div className="glass" style={{ padding: 28, textAlign: 'center', marginBottom: 20 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 8 }}>Today's Tasks</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 900, color: 'var(--accent-lime)', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {tasks.length}
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

      {/* Operations */}
      <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
        <Link to="/cleaner/earnings" className="glass" style={{ padding: 20, textDecoration: 'none', color: 'inherit' }}>
          <div className="flex justify-between items-start mb-2">
            <div style={{ width: 40, height: 40, background: 'var(--accent-lime)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}>
               <IndianRupee size={20} />
            </div>
            <ArrowRight size={16} className="text-secondary" />
          </div>
          <div className="text-label text-secondary">Earnings</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Check Payout</div>
        </Link>
        <Link to="/cleaner/attendance" className="glass" style={{ padding: 20, textDecoration: 'none', color: 'inherit' }}>
          <div className="flex justify-between items-start mb-2">
            <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E40AF' }}>
               <Calendar size={20} />
            </div>
            <ArrowRight size={16} className="text-secondary" />
          </div>
          <div className="text-label text-secondary">Attendance</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>History</div>
        </Link>
      </div>

      {/* Performance */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <div className="text-label text-secondary" style={{ marginBottom: 14 }}>Performance</div>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <span className="text-body-sm text-secondary">Completion Rate</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{tasks.length > 0 ? Math.round((completed/tasks.length)*100) : 0}%</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${tasks.length > 0 ? (completed/tasks.length)*100 : 0}%`, background: 'var(--success)' }} /></div>
        <div className="flex justify-between text-body-sm text-secondary" style={{ marginTop: 14 }}>
          <span>Rating: ★ {user?.rating?.toFixed(1) || 'N/A'}</span>
          <span>{completed} total completed</span>
        </div>
      </div>

      {/* Quick start */}
      <Link to="/cleaner/tasks" className="btn btn-primary w-full btn-lg" style={{ marginBottom: 100 }}>
        Start Tasks <ArrowRight size={18} />
      </Link>
    </div>
  )
}

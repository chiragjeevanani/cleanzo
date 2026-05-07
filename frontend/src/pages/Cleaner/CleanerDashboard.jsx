import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, Clock, AlertCircle, ArrowRight, IndianRupee, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'

export default function CleanerDashboard() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/cleaner/tasks')
        setTasks(res.tasks || [])
      } catch (err) {
        console.error('Error fetching tasks', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const pending = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const completed = tasks.filter(t => t.status === 'completed').length

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  return (
    <div style={{ padding: '0 20px' }}>
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
            <div style={{ width: 40, height: 40, background: 'var(--accent-lime)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'black' }}>
               <IndianRupee size={20} />
            </div>
            <ArrowRight size={16} className="text-secondary" />
          </div>
          <div className="text-label text-secondary">Earnings</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Check Payout</div>
        </Link>
        <Link to="/cleaner/attendance" className="glass" style={{ padding: 20, textDecoration: 'none', color: 'inherit' }}>
          <div className="flex justify-between items-start mb-2">
            <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#1E40AF' }}>
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
          <span>Rating: ★ 4.9</span>
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

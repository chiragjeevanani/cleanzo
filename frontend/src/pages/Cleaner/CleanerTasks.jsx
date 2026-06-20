import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, ChevronRight, RefreshCw } from 'lucide-react'
import apiClient from '../../services/apiClient'

const statusColors = { pending: 'var(--warning)', 'in-progress': 'var(--primary-blue)', completed: 'var(--success)' }
const statusLabels = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' }
const VALID_FILTERS = ['all', 'pending', 'in-progress', 'completed']

export default function CleanerTasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams()
  const initialFilter = VALID_FILTERS.includes(searchParams.get('filter')) ? searchParams.get('filter') : 'all'

  const [filter, setFilter] = useState(initialFilter)
  const [societyFilter, setSocietyFilter] = useState('all')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/cleaner/tasks')
      setTasks(res.tasks || [])
      setError('')
    } catch (err) {
      setError('Failed to load tasks.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchTasks() }, [])

  const handleRefresh = () => { setRefreshing(true); fetchTasks() }

  // Distinct societies present in today's task list, for the society filter chips.
  const societies = [...new Set(tasks.map(t => t.subscription?.society?.name).filter(Boolean))].sort()
  // Fall back to "all" if the previously selected society dropped out of the list (e.g. after a refresh).
  const effectiveSocietyFilter = societyFilter === 'all' || societies.includes(societyFilter) ? societyFilter : 'all'

  const filtered = tasks.filter(t =>
    (filter === 'all' || t.status === filter) &&
    (effectiveSocietyFilter === 'all' || t.subscription?.society?.name === effectiveSocietyFilter)
  )

  // Tasks arrive pre-sorted by scheduled time (earliest first); the first
  // not-yet-completed task is the cleaner's next priority job.
  const priorityTaskId = tasks.find(t => t.status !== 'completed')?._id

  if (loading) return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <div style={{ width: 20, height: 20 }} />
        <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 8 }} />
        <div style={{ width: 20 }} />
      </div>
      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        {[80, 65, 95, 85].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: 28, borderRadius: 20 }} />
        ))}
      </div>
      <div className="flex flex-col gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="skeleton" style={{ width: 4, height: 48, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '55%', height: 14, borderRadius: 8, marginBottom: 10 }} />
              <div className="skeleton" style={{ width: '78%', height: 12, borderRadius: 8, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '48%', height: 11, borderRadius: 8 }} />
            </div>
            <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 20px' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', margin: '12px 0', fontSize: 14 }}>
          {error}
        </div>
      )}
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)}  className="flex items-center gap-8" style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', outline: 'none' }}><ArrowLeft size={20} /></button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Today's Tasks</span>
        <button onClick={handleRefresh} aria-label="Refresh tasks" disabled={refreshing} style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: refreshing ? 'default' : 'pointer', display: 'flex' }}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-8" style={{ marginBottom: societies.length > 1 ? 12 : 20, overflowX: 'auto' }}>
        {['all', 'pending', 'in-progress', 'completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`chip ${filter === f ? 'chip-lime' : 'chip-ghost'}`}
            style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {f === 'all' ? 'All' : statusLabels[f]}
          </button>
        ))}
      </div>

      {/* Society filter chips — only worth showing when there's more than one society today */}
      {societies.length > 1 && (
        <div className="flex gap-8" style={{ marginBottom: 20, overflowX: 'auto' }}>
          <button onClick={() => setSocietyFilter('all')}
            className={`chip ${effectiveSocietyFilter === 'all' ? 'chip-blue' : 'chip-ghost'}`}
            style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
            All Societies
          </button>
          {societies.map(s => (
            <button key={s} onClick={() => setSocietyFilter(s)}
              className={`chip ${effectiveSocietyFilter === s ? 'chip-blue' : 'chip-ghost'}`}
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {filtered.length === 0 ? (
          <div className="text-center text-secondary py-8">No tasks found.</div>
        ) : filtered.map(t => {
          const isPriority = t._id === priorityTaskId
          return (
            <Link key={t._id} to={`/cleaner/tasks/${t._id}`} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 4, height: 48, borderRadius: 2, background: isPriority ? 'var(--primary-blue)' : (statusColors[t.status] || 'var(--text-secondary)'), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 4, gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.vehicle?.model || 'Vehicle'}</span>
                  <div className="flex items-center gap-4" style={{ flexShrink: 0 }}>
                    {isPriority && (
                      <span className="chip" style={{ background: 'rgba(var(--primary-blue-rgb), 0.15)', color: 'var(--primary-blue)', fontSize: 10 }}>
                        Next Up
                      </span>
                    )}
                    <span className="chip" style={{ background: `${statusColors[t.status]}20`, color: statusColors[t.status], fontSize: 10 }}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </div>
                </div>
                <div className="text-body-sm text-secondary">{t.customer?.name || t.customer?.phone || 'Customer'}</div>
                <div className="flex items-center gap-12 text-body-sm text-tertiary" style={{ marginTop: 6 }}>
                  <span className="flex items-center gap-4" style={{ flex: 1, minWidth: 0 }}><MapPin size={12} style={{ flexShrink: 0 }} /> {[t.subscription?.society?.name, t.vehicle?.parking].filter(Boolean).join(' · ') || 'Location'}</span>
                  <span className="flex items-center gap-4" style={{ flexShrink: 0 }}><Clock size={12} /> {t.scheduledTime || 'Morning'}</span>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

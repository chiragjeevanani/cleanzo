import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function CleanerHistory() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/cleaner/history?limit=50')
        setTasks(res.tasks || [])
      } catch (err) {
        setError('Failed to load history.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/cleaner" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>History</span></Link>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {tasks.length === 0 && !error && (
          <div className="text-body-sm text-secondary" style={{ textAlign: 'center', marginTop: 40 }}>No history yet.</div>
        )}
        {tasks.map((t) => (
          <div key={t._id} className="glass" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.vehicle?.model || 'Vehicle'}</div>
              <div className="text-body-sm text-secondary">
                {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {t.customer?.name && (
                <div className="text-body-sm text-secondary">{t.customer.name}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                color: t.status === 'completed' ? 'var(--success)' : 'var(--text-tertiary)',
                textTransform: 'capitalize'
              }}>
                {t.status}
              </div>
              {t.vehicle?.number && (
                <div className="text-body-sm text-secondary">{t.vehicle.number}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import apiClient from '../../services/apiClient'

export default function AdminSubscriptions() {
  const [filter, setFilter] = useState('all')
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const res = await apiClient.get('/admin/subscriptions')
        setSubs(res.subscriptions || [])
      } catch (err) {
        console.error('Error fetching subscriptions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubs()
  }, [])

  const filtered = filter === 'all' ? subs : subs.filter(s => (s.status || '').toLowerCase() === filter)

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Subscriptions</h1>
      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        {['all', 'active', 'expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-lime' : 'chip-ghost'}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>User</th><th>Vehicle</th><th>Plan</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-4 text-secondary">No subscriptions found.</td></tr>
            ) : filtered.map(s => (
              <tr key={s._id}>
                <td style={{ fontWeight: 500 }}>{s.customerName || 'User'}</td>
                <td className="text-secondary">{s.vehicleName || 'Vehicle'}</td>
                <td><span className={`chip ${s.packageName === 'Elite' ? 'chip-lime' : s.packageName === 'Premium' ? 'chip-blue' : 'chip-ghost'}`}>{s.packageName || 'Basic'}</span></td>
                <td className="text-secondary">{new Date(s.startDate).toLocaleDateString()}</td>
                <td className="text-secondary">{new Date(s.endDate).toLocaleDateString()}</td>
                <td><span className={`chip ${s.status === 'active' ? 'chip-success' : 'chip-error'}`}>{s.status || 'active'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

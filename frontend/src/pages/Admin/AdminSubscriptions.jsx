import { useState, useEffect } from 'react'
import apiClient from '../../services/apiClient'

export default function AdminSubscriptions() {
  const [filter, setFilter] = useState('all')
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const res = await apiClient.get('/admin/subscriptions')
        setSubs(res.subscriptions || [])
      } catch (err) {
        setError('Failed to load subscriptions.')
      } finally {
        setLoading(false)
      }
    }
    fetchSubs()
  }, [])

  const filtered = filter === 'all'
    ? subs
    : subs.filter(s => (s.status || '').toLowerCase() === filter)

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 32, width: 180, borderRadius: 8, marginBottom: 24 }} />
      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 28, width: 64, borderRadius: 20 }} />)}
      </div>
      <div className="glass" style={{ overflow: 'hidden', borderRadius: 16 }}>
        {[0,1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 52, margin: '8px 16px', borderRadius: 8 }} />)}
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Subscriptions</h1>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        {['all', 'Active', 'Expired'].map(f => (
          <button key={f} onClick={() => setFilter(f === 'all' ? 'all' : f)} className={`chip ${filter === f ? 'chip-lime' : 'chip-ghost'}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>User</th><th>Vehicle</th><th>Plan</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-4 text-secondary">No subscriptions found.</td></tr>
            ) : filtered.map(s => {
              const customerName = s.customer
                ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() || 'User'
                : 'User'
              const vehicleName = s.vehicle?.model || 'Vehicle'
              const packageName = s.package?.name || (s.isTrial ? 'Trial' : 'Basic')
              const statusLower = (s.status || 'Active').toLowerCase()
              return (
                <tr key={s._id}>
                  <td style={{ fontWeight: 500 }}>{customerName}</td>
                  <td className="text-secondary">{vehicleName}</td>
                  <td><span className={`chip ${packageName === 'Elite' ? 'chip-lime' : packageName === 'Premium' ? 'chip-blue' : 'chip-ghost'}`}>{packageName}</span></td>
                  <td className="text-secondary">{new Date(s.startDate).toLocaleDateString()}</td>
                  <td className="text-secondary">{new Date(s.endDate).toLocaleDateString()}</td>
                  <td><span className={`chip ${statusLower === 'active' ? 'chip-success' : 'chip-error'}`}>{s.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

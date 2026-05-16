import { useState, useEffect } from 'react'
import { UserPlus, CheckCircle, Clock, ShieldCheck, User } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminSubscriptions() {
  const [filter, setFilter] = useState('all')
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [cleaners, setCleaners] = useState([])
  const { showToast } = useToast()

  const fetchData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        apiClient.get('/admin/subscriptions'),
        apiClient.get('/admin/cleaners')
      ])
      setSubs(sRes.subscriptions || [])
      setCleaners(cRes.cleaners || [])
    } catch (err) {
      setError('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAssignCleaner = async (subId, cleanerId) => {
    try {
      await apiClient.put(`/admin/subscriptions/${subId}/assign-cleaner`, { cleanerId })
      showToast('Cleaner assigned successfully')
      fetchData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

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
          <thead><tr><th>User</th><th>Vehicle</th><th>Plan</th><th>Cleaner</th><th>Status</th></tr></thead>
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
              const isExpired = statusLower === 'expired' || statusLower === 'cancelled'
              const usage = `${s.completedDays || 0}/${s.totalDays || 30}`
              const remaining = s.remainingDays ?? (s.totalDays - s.completedDays)

              return (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>
                    <div className="flex flex-col">
                      <span>{customerName}</span>
                      <span className="text-[10px] text-tertiary font-bold uppercase">{s.society?.name || 'No Society'}</span>
                    </div>
                  </td>
                  <td className="text-secondary">{vehicleName}</td>
                  <td>
                    <div className="flex flex-col gap-4">
                      <span className={`chip ${packageName === 'Elite' ? 'chip-lime' : packageName === 'Premium' ? 'chip-blue' : 'chip-ghost'}`} style={{ width: 'fit-content' }}>{packageName}</span>
                      <span className="text-[10px] text-tertiary font-bold px-4">Usage: {usage} ({remaining} left)</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-8">
                      {s.assignedCleaner ? (
                        <div className={`flex items-center gap-6 text-xs font-bold ${isExpired ? 'text-tertiary' : 'text-success'}`}>
                          <ShieldCheck size={14} />
                          {s.assignedCleaner.name}
                          {!isExpired && (
                            <select 
                              className="bg-transparent border-none text-[10px] text-tertiary cursor-pointer hover:text-primary outline-none"
                              onChange={(e) => handleAssignCleaner(s._id, e.target.value)}
                              value={s.assignedCleaner._id}
                            >
                              {cleaners.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                          )}
                        </div>
                      ) : (
                        <select 
                          className={`chip ${isExpired ? 'opacity-50 cursor-not-allowed' : 'chip-ghost cursor-pointer'} text-xs outline-none`}
                          onChange={(e) => handleAssignCleaner(s._id, e.target.value)}
                          defaultValue=""
                          disabled={isExpired}
                        >
                          <option value="" disabled>{isExpired ? 'Subscription Ended' : 'Assign Cleaner'}</option>
                          {!isExpired && cleaners.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
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

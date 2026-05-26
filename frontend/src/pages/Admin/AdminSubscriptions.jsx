import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, CheckCircle, Clock, ShieldCheck, User, Download } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { exportToExcel } from '../../utils/excelExporter'

export default function AdminSubscriptions() {
  const [searchParams] = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'
  const [filter, setFilter] = useState(initialFilter)

  useEffect(() => {
    const queryFilter = searchParams.get('filter')
    if (queryFilter) {
      setFilter(queryFilter)
    } else {
      setFilter('all')
    }
  }, [searchParams])

  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [cleaners, setCleaners] = useState([])
  const { showToast } = useToast()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await apiClient.get('/admin/subscriptions?limit=all')
      const allSubs = res.subscriptions || []
      
      const filteredExport = filter === 'all'
        ? allSubs
        : allSubs.filter(s => getDisplayStatus(s).toLowerCase() === filter.toLowerCase())

      exportToExcel({
        data: filteredExport,
        filename: 'Subscriptions_Export',
        columns: [
          { label: 'Customer Name', key: (s) => s.customer ? `${s.customer.firstName || ''} ${s.customer.lastName || ''}`.trim() : 'N/A' },
          { label: 'Customer Phone', key: (s) => s.customer?.phone || 'N/A' },
          { label: 'Cleaner Assigned', key: (s) => s.assignedCleaner?.name || 'Unassigned' },
          { label: 'Society Name', key: (s) => s.society?.name || 'N/A' },
          { label: 'Vehicle Model', key: (s) => s.vehicle?.model || 'N/A' },
          { label: 'Package Name', key: (s) => s.package?.name || (s.isTrial ? 'Trial' : 'Basic') },
          { label: 'Time Slot', key: (s) => s.slot || 'N/A' },
          { label: 'Start Date', key: (s) => s.startDate ? new Date(s.startDate).toLocaleDateString() : 'N/A' },
          { label: 'End Date', key: (s) => s.endDate ? new Date(s.endDate).toLocaleDateString() : 'N/A' },
          { label: 'Completed Washes', key: (s) => s.completedDays || 0 },
          { label: 'Skipped Washes', key: (s) => s.skippedDays || 0 },
          { label: 'Total Days', key: (s) => s.totalDays || 30 },
          { label: 'Amount Paid', key: (s) => s.amountPaid || s.amount || 0 },
          { label: 'Status', key: (s) => getDisplayStatus(s) }
        ]
      })
    } catch (err) {
      setError('Failed to export subscription records. Please try again.')
    } finally {
      setExporting(false)
    }
  }

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

  const getDisplayStatus = (s) => {
    const remaining = s.remainingDays ?? (s.totalDays - s.completedDays)
    let displayStatus = s.status || 'Active'
    if (remaining <= 0 && displayStatus.toLowerCase() === 'active') {
      displayStatus = 'Expired'
    }
    return displayStatus
  }

  const filtered = filter === 'all'
    ? subs
    : filter === 'trial'
      ? subs.filter(s => s.isTrial)
      : subs.filter(s => getDisplayStatus(s).toLowerCase() === filter.toLowerCase())

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
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Subscriptions</h1>
        <button 
          disabled={exporting}
          className="btn btn-glass btn-sm text-success" 
          onClick={handleExport}
          style={{ borderColor: 'rgba(50,215,75,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={16} /> {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex gap-8" style={{ marginBottom: 20 }}>
        {['all', 'Active', 'Expired', 'trial'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter.toLowerCase() === f.toLowerCase() ? 'chip-lime' : 'chip-ghost'}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{f === 'trial' ? 'Trial' : f}</button>
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
              const usage = `${s.completedDays || 0}/${s.totalDays || 30}`
              const remaining = s.remainingDays ?? (s.totalDays - s.completedDays)

              const displayStatus = getDisplayStatus(s)
              const statusLower = displayStatus.toLowerCase()
              const isExpired = statusLower === 'expired' || statusLower === 'cancelled'

              const isOverride = s.isPremiumOverride;

              return (
                <tr key={s._id} style={isOverride ? { background: 'rgba(255, 149, 0, 0.02)', borderLeft: '3.5px solid #FF9500' } : {}}>
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
                      {isOverride && (
                        <span className="chip animate-pulse" style={{ 
                          background: 'rgba(255, 149, 0, 0.1)', 
                          color: '#FF9500', 
                          borderColor: 'rgba(255, 149, 0, 0.25)', 
                          fontSize: 9, 
                          fontWeight: 800, 
                          textTransform: 'uppercase', 
                          marginTop: 4, 
                          width: 'fit-content',
                          padding: '3px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          👑 Priority Override
                        </span>
                      )}
                      <span className="text-[10px] text-tertiary font-bold px-4">Usage: {usage} ({remaining} left)</span>
                      {isOverride && (
                        <span className="text-[10px]" style={{ color: '#FF9500', fontStyle: 'italic', display: 'block', marginTop: 4, lineHeight: 1.3 }}>
                          Reason: {s.overrideReason || 'N/A'} (Fee: ₹{s.priorityFee || 0})
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-8">
                      {s.assignedCleaner ? (
                        <div className={`flex items-center gap-6 text-xs font-bold ${isExpired || remaining <= 0 ? 'text-tertiary' : 'text-success'}`}>
                          <ShieldCheck size={14} />
                          {s.assignedCleaner.name}
                          {(!isExpired && remaining > 0) && (
                            <select 
                              className="bg-transparent border-none text-[10px] text-tertiary cursor-pointer hover:text-primary outline-none"
                              onChange={(e) => handleAssignCleaner(s._id, e.target.value)}
                              value={s.assignedCleaner._id}
                            >
                              {cleaners.map(c => <option key={c._id} value={c._id} style={{ background: '#1c1c1e', color: '#fff' }}>{c.name}</option>)}
                            </select>
                          )}
                        </div>
                      ) : (
                        <select 
                          className={`chip ${isExpired || remaining <= 0 ? 'opacity-50 cursor-not-allowed' : 'chip-ghost cursor-pointer'} text-xs outline-none`}
                          onChange={(e) => handleAssignCleaner(s._id, e.target.value)}
                          defaultValue=""
                          disabled={isExpired || remaining <= 0}
                        >
                          <option value="" disabled style={{ background: '#1c1c1e', color: '#888' }}>{isExpired || remaining <= 0 ? 'No Usage Left' : 'Assign Cleaner'}</option>
                          {!isExpired && remaining > 0 && cleaners.map(c => <option key={c._id} value={c._id} style={{ background: '#1c1c1e', color: '#fff' }}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                  <td><span className={`chip ${statusLower === 'active' ? 'chip-success' : 'chip-error'}`}>{displayStatus}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

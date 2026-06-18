import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { UserPlus, CheckCircle, Clock, ShieldCheck, User, Download, RefreshCw, AlertTriangle, X, Users, Eye } from 'lucide-react'
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

  // Multi-select city filter — view subscriptions for societies in chosen cities.
  const [cities, setCities] = useState([])
  const [selectedCities, setSelectedCities] = useState([])
  const citiesQuery = selectedCities.length ? `&cities=${encodeURIComponent(selectedCities.join(','))}` : ''
  const toggleCity = (name) =>
    setSelectedCities(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])

  // Cron trigger state
  const [showCronConfirm, setShowCronConfirm] = useState(false)
  const [cronRunning, setCronRunning]         = useState(false)
  const [cronResults, setCronResults]         = useState(null)  // array of { job, status, ms }
  const [cronRunAt, setCronRunAt]             = useState('')

  // Assign All Cleaners state
  const [distributeAll, setDistributeAll] = useState(false)
  const [showAssignConfirm, setShowAssignConfirm] = useState(false)
  const [assignRunning, setAssignRunning]         = useState(false)
  const [assignResults, setAssignResults]         = useState(null)
  // Scope: assign to every society, or a specific selection of societies.
  const [assignScope, setAssignScope] = useState('all') // 'all' | 'specific'
  const [societies, setSocieties] = useState([])
  const [selectedAssignSocieties, setSelectedAssignSocieties] = useState([])
  const toggleAssignSociety = (id) =>
    setSelectedAssignSocieties(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await apiClient.get(`/admin/subscriptions?limit=all${citiesQuery}`)
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
          { label: 'City', key: (s) => s.society?.city || 'N/A' },
          { label: 'Vehicle Model', key: (s) => s.vehicle?.model || 'N/A' },
          { label: 'Package Name', key: (s) => s.package?.name || (s.isTrial ? 'Trial' : 'Basic') },
          { label: 'Time Slot', key: (s) => s.slot || 'N/A' },
          { label: 'Start Date', key: (s) => s.startDate ? new Date(s.startDate).toLocaleDateString() : 'N/A' },
          { label: 'End Date', key: (s) => s.endDate ? new Date(s.endDate).toLocaleDateString() : 'N/A' },
          { label: 'Completed Cleans', key: (s) => s.completedDays || 0 },
          { label: 'Skipped Cleans', key: (s) => s.skippedDays || 0 },
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
        apiClient.get(`/admin/subscriptions?limit=all${citiesQuery}`),
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
  }, [selectedCities])

  useEffect(() => {
    apiClient.get('/admin/cities')
      .then(res => setCities(res.cities || []))
      .catch(() => {})
    apiClient.get('/admin/societies')
      .then(res => setSocieties((res.societies || []).filter(s => s.isActive)))
      .catch(() => {})
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

  const handleRunCronJobs = async () => {
    setCronRunning(true)
    setShowCronConfirm(false)
    setCronResults(null)
    try {
      const res = await apiClient.post('/admin/maintenance/trigger-cron', { job: 'all' })
      setCronResults(res.results || [])
      setCronRunAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      const failed = (res.results || []).filter(r => r.status !== 'ok')
      if (failed.length === 0) {
        showToast('All cron jobs ran successfully. Tasks created & cleaners assigned.')
      } else {
        showToast(`${failed.length} job(s) failed — check results below.`, 'error')
      }
      fetchData() // refresh subscription list after tasks are created
    } catch (err) {
      showToast(err.message || 'Failed to run cron jobs', 'error')
    } finally {
      setCronRunning(false)
    }
  }

  const handleAssignAllCleaners = async () => {
    if (assignScope === 'specific' && selectedAssignSocieties.length === 0) {
      showToast('Select at least one society, or choose "All societies".', 'error')
      return
    }
    setAssignRunning(true)
    setShowAssignConfirm(false)
    setAssignResults(null)
    try {
      const res = await apiClient.post('/admin/maintenance/assign-all-cleaners', {
        redistribute: distributeAll,
        ...(assignScope === 'specific' ? { societyIds: selectedAssignSocieties } : {}),
      })
      setAssignResults(res)
      if (res.assigned > 0) {
        showToast(`✅ Assigned cleaners to ${res.assigned} subscription(s).`)
      } else if (res.alreadyAssigned > 0 && res.assigned === 0) {
        showToast('All active subscriptions already have cleaners assigned.', 'info')
      } else {
        showToast(res.message || 'No subscriptions to assign.', 'info')
      }
      fetchData()
    } catch (err) {
      showToast(err.message || 'Failed to assign cleaners', 'error')
    } finally {
      setAssignRunning(false)
    }
  }

  // The address the cleaner actually sees: where the vehicle is parked
  // (vehicle parking spot) + the customer's saved address.
  const getParkingSpot = (s) => {
    if (s.vehicle?.parking) return s.vehicle.parking
    return [
      s.vehicle?.blockTower && `Block/Tower: ${s.vehicle.blockTower}`,
      s.vehicle?.slotPillar && `Slot/Pillar: ${s.vehicle.slotPillar}`,
      s.vehicle?.flatNumber && `Flat: ${s.vehicle.flatNumber}`,
    ].filter(Boolean).join(' · ')
  }

  const getSavedAddress = (s) => {
    const addrs = s.customer?.addresses || []
    const a = addrs.find(x => x.isDefault) || addrs[0]
    if (!a) return ''
    return [
      a.flat, a.tower, a.societyName, a.line1, a.line2, a.city,
      a.pincode ? `- ${a.pincode}` : '',
    ].filter(Boolean).join(', ').replace(', -', ' -')
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
      {/* ── Header ── */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Subscriptions</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Assign All Cleaners button */}
          <button
            disabled={assignRunning}
            className="btn btn-sm"
            onClick={() => { setAssignResults(null); setShowAssignConfirm(true) }}
            style={{
              background: 'linear-gradient(135deg, #32d74b, #28a745)',
              color: '#fff', border: 'none', borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: 700, fontSize: 13,
              opacity: assignRunning ? 0.7 : 1,
              boxShadow: '0 2px 12px rgba(50,215,75,0.3)',
            }}
          >
            <Users size={15} className={assignRunning ? 'animate-spin' : ''} />
            {assignRunning ? 'Assigning…' : 'Assign All Cleaners'}
          </button>

          {/* Run Cron Jobs button */}
          <button
            disabled={cronRunning}
            className="btn btn-glass btn-sm"
            onClick={() => { setCronResults(null); setShowCronConfirm(true) }}
            style={{ borderColor: 'rgba(100,180,255,0.35)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={cronRunning ? 'animate-spin' : ''} />
            {cronRunning ? 'Running Jobs…' : 'Run Cron Jobs'}
          </button>

          <button
            disabled={exporting}
            className="btn btn-glass btn-sm text-success"
            onClick={handleExport}
            style={{ borderColor: 'rgba(50,215,75,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* ── Cron Confirm Modal ── */}
      {showCronConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="glass-solid" style={{
            borderRadius: 20, padding: 32, maxWidth: 440, width: '90%',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={20} style={{ color: '#FF9F0A' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Run All Cron Jobs?</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  This will run all 4 scheduled jobs immediately.
                </div>
              </div>
              <button
                onClick={() => setShowCronConfirm(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 24, fontSize: 13,
              color: 'var(--text-secondary)', lineHeight: 1.6,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { icon: '🕛', label: '1. Expire referral discounts' },
                  { icon: '🔴', label: '2. Expire overdue subscriptions & free up slots' },
                  { icon: '📋', label: '3. Create today\'s tasks for all active subscriptions' },
                  { icon: '🔔', label: '4. Send expiry & referral reminders' },
                ].map(({ icon, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>{icon}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-glass btn-sm"
                onClick={() => setShowCronConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                onClick={handleRunCronJobs}
                style={{
                  flex: 1, background: 'var(--primary-blue)', color: '#fff',
                  border: 'none', borderRadius: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <RefreshCw size={14} /> Run Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign All Cleaners Confirm Modal ── */}
      {showAssignConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="glass-solid" style={{
            borderRadius: 20, padding: 32, maxWidth: 460, width: '90%',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'rgba(50,215,75,0.12)', border: '1px solid rgba(50,215,75,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={20} style={{ color: '#32d74b' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Assign All Cleaners</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Distribute work across all available cleaners
                </div>
              </div>
              <button
                onClick={() => setShowAssignConfirm(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode toggle */}
            <div style={{
              background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
              borderRadius: 14, marginBottom: 16, overflow: 'hidden',
            }}>
              {/* Option A — Fill unassigned only */}
              <button
                onClick={() => setDistributeAll(false)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--border-glass)', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `2px solid ${!distributeAll ? '#32d74b' : 'var(--border-glass)'}`,
                  background: !distributeAll ? '#32d74b' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!distributeAll && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    Fill unassigned only
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Only assign cleaners to subscriptions that currently have none. Keeps existing assignments untouched.
                  </div>
                </div>
              </button>

              {/* Option B — Redistribute all (round-robin) */}
              <button
                onClick={() => setDistributeAll(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', background: distributeAll ? 'rgba(50,215,75,0.04)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `2px solid ${distributeAll ? '#32d74b' : 'var(--border-glass)'}`,
                  background: distributeAll ? '#32d74b' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {distributeAll && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    Redistribute all (round-robin) ⚖️
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Reassign <strong>all</strong> active subscriptions fresh. Spreads work evenly — each cleaner gets an equal share. Use this to fix skewed assignments.
                  </div>
                </div>
              </button>
            </div>

            {/* Scope — all societies vs a specific selection */}
            <div style={{
              background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
              borderRadius: 14, marginBottom: 16, overflow: 'hidden',
            }}>
              {/* All societies */}
              <button
                onClick={() => setAssignScope('all')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', background: 'none', border: 'none',
                  borderBottom: '1px solid var(--border-glass)', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `2px solid ${assignScope === 'all' ? '#32d74b' : 'var(--border-glass)'}`,
                  background: assignScope === 'all' ? '#32d74b' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {assignScope === 'all' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>All societies (every city)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Process subscriptions across all societies in every city.
                  </div>
                </div>
              </button>

              {/* Specific societies */}
              <button
                onClick={() => setAssignScope('specific')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', background: assignScope === 'specific' ? 'rgba(50,215,75,0.04)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `2px solid ${assignScope === 'specific' ? '#32d74b' : 'var(--border-glass)'}`,
                  background: assignScope === 'specific' ? '#32d74b' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {assignScope === 'specific' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    Specific societies {selectedAssignSocieties.length > 0 && `(${selectedAssignSocieties.length})`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Pick the societies to assign cleaners to.
                  </div>
                </div>
              </button>

              {/* Checkbox list — grouped by city */}
              {assignScope === 'specific' && (
                <div style={{ maxHeight: 200, overflowY: 'auto', borderTop: '1px solid var(--border-glass)', padding: '8px 0' }}>
                  {societies.length === 0 ? (
                    <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-tertiary)' }}>No active societies found.</div>
                  ) : (
                    Object.entries(
                      societies.reduce((acc, s) => {
                        (acc[s.city] = acc[s.city] || []).push(s); return acc
                      }, {})
                    ).map(([cityName, list]) => (
                      <div key={cityName}>
                        <div style={{ padding: '6px 16px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{cityName}</div>
                        {list.map(s => {
                          const checked = selectedAssignSocieties.includes(s._id)
                          return (
                            <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleAssignSociety(s._id)} style={{ accentColor: '#32d74b', width: 16, height: 16 }} />
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.name}</span>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{s.area}</span>
                            </label>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Info note */}
            <div style={{
              fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {distributeAll
                ? '⚖️ Round-robin: subscription 1 → cleaner A, sub 2 → cleaner B, sub 3 → cleaner C … each cleaner gets equal work. Today\'s task is updated immediately.'
                : '🔍 Only subscriptions with no cleaner (or an inactive/on-leave cleaner) will be filled. Others are left as-is.'}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-glass btn-sm"
                onClick={() => setShowAssignConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                onClick={handleAssignAllCleaners}
                style={{
                  flex: 1,
                  background: distributeAll
                    ? 'linear-gradient(135deg, #007AFF, #0056CC)'
                    : 'linear-gradient(135deg, #32d74b, #28a745)',
                  color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Users size={14} /> {distributeAll ? 'Redistribute All' : 'Assign Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign All Results Banner ── */}
      {assignResults && (
        <div style={{
          padding: '14px 18px', borderRadius: 14, marginBottom: 18,
          background: assignResults.failed === 0
            ? 'rgba(50,215,75,0.05)' : 'rgba(255,159,10,0.05)',
          border: `1px solid ${assignResults.failed === 0
            ? 'rgba(50,215,75,0.2)' : 'rgba(255,159,10,0.2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>
              {assignResults.failed === 0 ? '✅' : '⚠️'} {assignResults.message}
            </span>
            <button
              onClick={() => setAssignResults(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Assigned', value: assignResults.assigned, color: '#32d74b' },
              { label: 'Already OK', value: assignResults.alreadyAssigned, color: '#64d2ff' },
              { label: 'Failed', value: assignResults.failed, color: '#ff5555' },
              { label: 'Unassigned', value: assignResults.unassigned, color: '#FF9F0A' },
              { label: 'Total Active', value: assignResults.total, color: 'var(--text-secondary)' },
            ].map(({ label, value, color }) => (
              <span key={label} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: `${color}15`, color,
                border: `1px solid ${color}40`,
              }}>
                {label}: {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Cron Results Banner ── */}
      {cronResults && (
        <div style={{
          padding: '14px 18px', borderRadius: 14, marginBottom: 18,
          background: cronResults.every(r => r.status === 'ok')
            ? 'rgba(50,215,75,0.05)' : 'rgba(255,159,10,0.05)',
          border: `1px solid ${cronResults.every(r => r.status === 'ok')
            ? 'rgba(50,215,75,0.2)' : 'rgba(255,159,10,0.2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>
              {cronResults.every(r => r.status === 'ok') ? '✅' : '⚠️'} Cron jobs ran at {cronRunAt}
            </span>
            <button
              onClick={() => setCronResults(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cronResults.map(r => {
              const label = r.job
                .replace('expireReferralDiscounts', 'Expire Referrals')
                .replace('expireSubscriptions',     'Expire Subs')
                .replace('createDailyTasks',        'Create Tasks')
                .replace('sendReminders',           'Send Reminders')
              return (
                <span key={r.job} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: r.status === 'ok' ? 'rgba(50,215,75,0.1)' : 'rgba(255,50,50,0.1)',
                  color:      r.status === 'ok' ? '#32d74b'              : '#ff5555',
                  border:     `1px solid ${r.status === 'ok' ? 'rgba(50,215,75,0.25)' : 'rgba(255,50,50,0.25)'}`,
                }}>
                  {r.status === 'ok' ? '✓' : '✗'} {label}
                  <span style={{ opacity: 0.6, marginLeft: 4 }}>{r.ms}ms</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex gap-8" style={{ marginBottom: 16 }}>
        {['all', 'Active', 'Expired', 'trial'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter.toLowerCase() === f.toLowerCase() ? 'chip-lime' : 'chip-ghost'}`} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>{f === 'trial' ? 'Trial' : f}</button>
        ))}
      </div>

      {/* City filter — multi-select; view societies from one or more cities */}
      {cities.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>FILTER BY CITY</span>
            {selectedCities.length > 0 && (
              <button onClick={() => setSelectedCities([])} className="chip chip-ghost" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> Clear ({selectedCities.length})
              </button>
            )}
          </div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {cities.map(c => (
              <button
                key={c._id || c.name}
                onClick={() => toggleCity(c.name)}
                className={`chip ${selectedCities.includes(c.name) ? 'chip-lime' : 'chip-ghost'}`}
                style={{ cursor: 'pointer' }}
              >
                {selectedCities.includes(c.name) ? '✓ ' : ''}{c.name}
              </button>
            ))}
          </div>
        </div>
      )}
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
                    <div className="flex flex-col gap-6">
                      <span>{customerName}</span>
                      {(() => {
                        const parking = getParkingSpot(s)
                        const saved = getSavedAddress(s)
                        return (
                          <div className="flex flex-col" style={{ gap: 2, maxWidth: 260 }}>
                            {parking && (
                              <span className="text-[10px] text-secondary font-semibold" style={{ lineHeight: 1.3 }}>
                                🅿️ {parking}
                              </span>
                            )}
                            {saved ? (
                              <span className="text-[10px] text-tertiary font-bold" style={{ lineHeight: 1.3 }}>
                                📍 {saved}
                              </span>
                            ) : !parking && (
                              <span className="text-[10px] text-tertiary font-bold uppercase">
                                {s.society?.name || 'No address'}
                                {s.society?.area ? ` · ${s.society.area}` : ''}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      {s.customer && (
                        <Link
                          to={`/admin/users/${s.customer._id}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            width: 'fit-content', marginTop: 2,
                            padding: '7px 14px', borderRadius: 10,
                            background: 'linear-gradient(135deg, #007AFF, #0056CC)',
                            color: '#fff', fontSize: 12, fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 2px 10px rgba(0,122,255,0.3)',
                          }}
                        >
                          <Eye size={14} /> View Details
                        </Link>
                      )}
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

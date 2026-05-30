import { useState, useEffect } from 'react'
import { Calendar, Search, Edit, Filter, X, Clock, UserCheck, UserX, AlertCircle, Info, CalendarDays } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminAttendance() {
  const [cleaners, setCleaners] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [selectedCleaner, setSelectedCleaner] = useState(null)
  const [overrideStatus, setOverrideStatus] = useState('present')
  const [overrideCheckIn, setOverrideCheckIn] = useState('')
  const [overrideCheckOut, setOverrideCheckOut] = useState('')
  const [overrideNote, setOverrideNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch cleaners
      const cleanersRes = await apiClient.get('/admin/cleaners?limit=all')
      setCleaners(cleanersRes.cleaners || [])

      // 2. Fetch attendance logs for selected date
      const attendanceRes = await apiClient.get(`/admin/cleaners/attendance`, { date: selectedDate })
      setAttendanceRecords(attendanceRes.records || [])
    } catch (err) {
      setError(err?.message || 'Failed to fetch attendance logs or cleaner records.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const handleOpenOverride = (cleaner, record) => {
    setSelectedCleaner(cleaner)
    setOverrideStatus(record?.status || 'present')
    
    // Set check-in time input if exists
    if (record?.checkIn) {
      const d = new Date(record.checkIn)
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      setOverrideCheckIn(`${hours}:${mins}`)
    } else {
      setOverrideCheckIn('')
    }

    // Set check-out time input if exists
    if (record?.checkOut) {
      const d = new Date(record.checkOut)
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      setOverrideCheckOut(`${hours}:${mins}`)
    } else {
      setOverrideCheckOut('')
    }

    setOverrideNote(record?.note || '')
    setShowOverrideModal(true)
  }

  const handleSaveOverride = async (e) => {
    e.preventDefault()
    if (!selectedCleaner) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Combine date and time
      let checkInDateTime = undefined
      if (overrideCheckIn) {
        const [hours, mins] = overrideCheckIn.split(':')
        const d = new Date(selectedDate)
        d.setHours(parseInt(hours), parseInt(mins), 0, 0)
        checkInDateTime = d.toISOString()
      }

      let checkOutDateTime = undefined
      if (overrideCheckOut) {
        const [hours, mins] = overrideCheckOut.split(':')
        const d = new Date(selectedDate)
        d.setHours(parseInt(hours), parseInt(mins), 0, 0)
        checkOutDateTime = d.toISOString()
      }

      await apiClient.put(`/admin/cleaners/attendance`, {
        cleanerId: selectedCleaner._id,
        date: selectedDate,
        status: overrideStatus,
        checkIn: checkInDateTime,
        checkOut: checkOutDateTime,
        note: overrideNote
      })

      setSuccess(`Attendance updated successfully for ${selectedCleaner.name}!`)
      setShowOverrideModal(false)
      fetchData() // Refresh logs

      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (err) {
      setError(err?.message || 'Failed to update attendance override.')
    } finally {
      setSaving(false)
    }
  }

  // Get unique list of areas
  const areas = [...new Set(cleaners.map(c => c.assignedArea).filter(Boolean))]

  // Correlate cleaners and attendance records
  const correlatedCleaners = cleaners.map(cleaner => {
    const record = attendanceRecords.find(r => {
      const rCleanerId = r.cleaner?._id || r.cleaner
      return rCleanerId === cleaner._id
    })
    return {
      cleaner,
      record,
      status: record?.status || 'pending' // 'present', 'absent', 'leave', 'pending'
    }
  })

  // Filter list
  const filteredList = correlatedCleaners.filter(({ cleaner, status }) => {
    const matchesSearch = !searchQuery || 
      cleaner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cleaner.phone.includes(searchQuery)
      
    const matchesArea = !filterArea || cleaner.assignedArea === filterArea
    const matchesStatus = filterStatus === 'all' || status === filterStatus

    return matchesSearch && matchesArea && matchesStatus
  })

  return (
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.2)', color: 'var(--text-accent)', marginBottom: 16, fontSize: 14 }}>
          {success}
        </div>
      )}

      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>Crew Attendance</h1>
          <p className="text-secondary" style={{ fontSize: 14 }}>View daily logs and manually override attendance</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-12 glass" style={{ padding: '6px 14px', borderRadius: 14, border: '1px solid var(--border-glass)' }}>
          <CalendarDays size={18} className="text-lime" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex gap-12" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input-field"
            placeholder="Search cleaner by name or phone..."
            style={{ paddingLeft: 42 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-8 ${showFilters || filterArea || filterStatus !== 'all' ? 'btn-primary' : 'btn-glass'}`}
          style={{ height: 44, borderRadius: 12, padding: '0 16px', fontWeight: 700 }}
        >
          <Filter size={16} /> Filters
          {(filterArea || filterStatus !== 'all') && (
            <span style={{ 
              background: '#000', 
              color: 'var(--accent-lime)', 
              fontSize: 10, 
              fontWeight: 800, 
              padding: '2px 6px', 
              borderRadius: 6 
            }}>
              Active
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters panel */}
      {showFilters && (
        <div className="glass" style={{ padding: 20, borderRadius: 16, marginBottom: 20, border: '1px solid var(--border-glass)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="flex flex-col gap-6">
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Area</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>All Areas</option>
              {areas.map(a => (
                <option key={a} value={a} style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-6">
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="all" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>All Statuses</option>
              <option value="present" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Present</option>
              <option value="absent" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Absent</option>
              <option value="leave" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>On Leave</option>
              <option value="pending" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Pending / No Log</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterArea('')
                setFilterStatus('all')
                setShowFilters(false)
              }}
              className="btn-glass"
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 700, fontSize: 13 }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="glass skeleton" style={{ height: 160, borderRadius: 16 }} />)}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center p-40" style={{ borderRadius: 20, textAlign: 'center', border: '1px solid var(--border-glass)' }}>
          <Info size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
          <h4 style={{ fontWeight: 700, fontSize: 16 }}>No Cleaners Found</h4>
          <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
            Either no cleaners are registered, or none match the selected filters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filteredList.map(({ cleaner, record, status }) => {
            const statusColor = status === 'present' ? 'var(--text-accent)' : status === 'absent' ? 'var(--error)' : status === 'leave' ? 'var(--primary-blue)' : 'rgba(255,255,255,0.4)'
            const statusBg = status === 'present' ? 'rgba(132,204,22,0.08)' : status === 'absent' ? 'rgba(239,68,68,0.08)' : status === 'leave' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)'
            
            return (
              <div 
                key={cleaner._id} 
                className="glass hover-glow" 
                style={{ 
                  padding: 20, 
                  borderRadius: 20, 
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'between'
                }}
              >
                <div>
                  <div className="flex justify-between items-start" style={{ marginBottom: 14 }}>
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{cleaner.name}</h4>
                      <p className="text-tertiary" style={{ fontSize: 12, marginTop: 2 }}>{cleaner.phone}</p>
                    </div>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      fontSize: 10, 
                      fontWeight: 900, 
                      padding: '4px 10px', 
                      borderRadius: 8, 
                      color: statusColor, 
                      background: statusBg, 
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}>
                      {status === 'pending' ? 'Pending' : status === 'leave' ? 'On Leave' : status}
                    </span>
                  </div>

                  <div className="flex flex-col gap-8" style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)', marginBottom: 16 }}>
                    <div className="flex justify-between text-secondary" style={{ fontSize: 12 }}>
                      <span>Area:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{cleaner.assignedArea || 'N/A'}</strong>
                    </div>

                    <div className="flex justify-between items-center text-secondary" style={{ fontSize: 12 }}>
                      <span className="flex items-center gap-4"><Clock size={12} /> Check-In:</span>
                      <strong style={{ color: record?.checkIn ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {record?.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-secondary" style={{ fontSize: 12 }}>
                      <span className="flex items-center gap-4"><Clock size={12} /> Check-Out:</span>
                      <strong style={{ color: record?.checkOut ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {record?.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </strong>
                    </div>
                  </div>

                  {record?.note && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: 16, borderLeft: '2px solid var(--border-glass)', paddingLeft: 8 }}>
                      "{record.note}"
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => handleOpenOverride(cleaner, record)}
                  className="btn-glass flex items-center justify-center gap-8"
                  style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700 }}
                >
                  <Edit size={14} /> Override Attendance
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedCleaner && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 999
        }}>
          <div className="glass-solid animate-scale-in" style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 28,
            padding: 24,
            border: '1px solid var(--border-glass)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <header className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900 }}>Override Attendance</h3>
                <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>{selectedCleaner.name} • {new Date(selectedDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}</p>
              </div>
              <button 
                onClick={() => setShowOverrideModal(false)} 
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSaveOverride} className="flex flex-col gap-16">
              <div className="flex flex-col gap-6">
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="present" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Present</option>
                  <option value="absent" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Absent</option>
                  <option value="leave" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>On Leave</option>
                </select>
              </div>

              {overrideStatus === 'present' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check-In Time</label>
                    <input 
                      type="time"
                      value={overrideCheckIn}
                      onChange={(e) => setOverrideCheckIn(e.target.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--border-glass)',
                        background: 'var(--bg-glass)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check-Out Time</label>
                    <input 
                      type="time"
                      value={overrideCheckOut}
                      onChange={(e) => setOverrideCheckOut(e.target.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--border-glass)',
                        background: 'var(--bg-glass)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-6">
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Note</label>
                <textarea 
                  placeholder="Reason for override, verification details, etc."
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 16,
                    border: '1px solid var(--border-glass)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1.5,
                    padding: 14,
                    borderRadius: 16,
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))',
                    color: '#0A0A0A',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

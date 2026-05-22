import { useState, useEffect } from 'react'
import { Calendar, Check, X, Search, Info, AlertCircle, FileClock, User, MapPin } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminLeaves() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [activeTab, setActiveTab] = useState('pending') // 'pending', 'approved', 'rejected', 'all'
  const [searchQuery, setSearchQuery] = useState('')

  // Rejection Modal / State
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchLeaveRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get('/admin/leaves', { status: activeTab })
      setRequests(res.leaveRequests || [])
    } catch (err) {
      setError('Failed to load leave requests.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaveRequests()
  }, [activeTab])

  const handleApprove = async (request) => {
    if (!window.confirm(`Are you sure you want to approve leave for ${request.cleaner?.name} on ${new Date(request.date).toLocaleDateString()}?`)) {
      return
    }

    try {
      await apiClient.put(`/admin/leaves/${request._id}/review`, { status: 'approved' })
      setSuccess(`Leave request approved successfully!`)
      fetchLeaveRequests()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err?.message || 'Failed to approve leave request.')
    }
  }

  const handleOpenReject = (request) => {
    setSelectedRequest(request)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRequest) return
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await apiClient.put(`/admin/leaves/${selectedRequest._id}/review`, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim()
      })
      setSuccess(`Leave request rejected successfully.`)
      setShowRejectModal(false)
      fetchLeaveRequests()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err?.message || 'Failed to reject leave request.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRequests = requests.filter(req => {
    const cleanerName = req.cleaner?.name || ''
    const cleanerPhone = req.cleaner?.phone || ''
    return cleanerName.toLowerCase().includes(searchQuery.toLowerCase()) || cleanerPhone.includes(searchQuery)
  })

  // Counts for summary cards
  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>Leave Applications</h1>
          <p className="text-secondary" style={{ fontSize: 14 }}>Review and approve/reject crew leave requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass flex" style={{ padding: 4, borderRadius: 16, marginBottom: 24, border: '1px solid var(--border-glass)', maxWidth: 600 }}>
        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 12,
              border: 'none',
              background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: activeTab === tab ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          className="input-field"
          placeholder="Search cleaner by name or phone..."
          style={{ paddingLeft: 42 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[0, 1, 2].map(i => <div key={i} className="glass skeleton" style={{ height: 180, borderRadius: 20 }} />)}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center p-40" style={{ borderRadius: 20, textAlign: 'center', border: '1px solid var(--border-glass)' }}>
          <FileClock size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
          <h4 style={{ fontWeight: 700, fontSize: 16 }}>No Leave Requests</h4>
          <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
            No leave applications found for status: <strong style={{ textTransform: 'capitalize' }}>{activeTab}</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredRequests.map((req) => {
            const dateObj = new Date(req.date)
            const statusColor = req.status === 'approved' ? 'var(--text-accent)' : req.status === 'rejected' ? 'var(--error)' : 'rgba(255,255,255,0.6)'
            const statusBg = req.status === 'approved' ? 'rgba(132,204,22,0.08)' : req.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)'

            return (
              <div 
                key={req._id} 
                className="glass hover-glow" 
                style={{ 
                  padding: 20, 
                  borderRadius: 24, 
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: 14, 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border-glass)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-tertiary)', lineHeight: 1 }}>
                          {dateObj.toLocaleDateString('default', { weekday: 'short' })}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 900, marginTop: 2, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {dateObj.getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: 15 }}>
                          {dateObj.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                        </h4>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Requested Leave Date</span>
                      </div>
                    </div>

                    <span style={{ 
                      fontSize: 9, 
                      fontWeight: 900, 
                      padding: '4px 10px', 
                      borderRadius: 8, 
                      color: statusColor, 
                      background: statusBg, 
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}>
                      {req.status}
                    </span>
                  </div>

                  {/* Cleaner Info */}
                  <div className="flex flex-col gap-6 text-secondary" style={{ marginBottom: 16, fontSize: 13 }}>
                    <div className="flex items-center gap-8">
                      <User size={14} className="text-lime" />
                      <strong>{req.cleaner?.name || 'Unknown Cleaner'}</strong>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>({req.cleaner?.phone || 'N/A'})</span>
                    </div>
                    {req.cleaner?.assignedArea && (
                      <div className="flex items-center gap-8" style={{ fontSize: 12 }}>
                        <MapPin size={14} style={{ color: 'var(--primary-blue)' }} />
                        <span>Area: {req.cleaner.assignedArea}</span>
                      </div>
                    )}
                  </div>

                  {/* Leave Reason */}
                  {req.reason && (
                    <div style={{ 
                      fontSize: 13, 
                      color: 'var(--text-secondary)', 
                      fontStyle: 'italic', 
                      background: 'rgba(255,255,255,0.01)', 
                      borderLeft: '2px solid var(--border-glass)',
                      padding: '4px 10px',
                      borderRadius: '0 8px 8px 0',
                      marginBottom: 16 
                    }}>
                      "{req.reason}"
                    </div>
                  )}

                  {/* Rejection Note */}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <div style={{ 
                      padding: '10px 12px', 
                      borderRadius: 12, 
                      background: 'rgba(239,68,68,0.03)', 
                      border: '1px solid rgba(239,68,68,0.1)', 
                      fontSize: 12, 
                      color: 'var(--error)', 
                      marginBottom: 16 
                    }}>
                      <strong>Reason Rejected: </strong>
                      {req.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                  <div className="flex gap-10" style={{ marginTop: 12 }}>
                    <button 
                      onClick={() => handleOpenReject(req)}
                      className="btn btn-glass flex-1 flex items-center justify-center gap-6"
                      style={{ padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, color: 'var(--error)' }}
                    >
                      <X size={14} /> Reject
                    </button>
                    <button 
                      onClick={() => handleApprove(req)}
                      className="btn btn-primary flex-1 flex items-center justify-center gap-6"
                      style={{ padding: '10px 0', borderRadius: 12, fontSize: 12, fontWeight: 800 }}
                    >
                      <Check size={14} /> Approve
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && selectedRequest && (
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
          <div className="glass animate-scale-in" style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 28,
            padding: 24,
            border: '1px solid var(--border-glass)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <header className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900 }}>Reject Leave Request</h3>
                <p className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>{selectedRequest.cleaner?.name} • {new Date(selectedRequest.date).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)} 
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

            <form onSubmit={handleRejectSubmit} className="flex flex-col gap-16">
              <div className="flex flex-col gap-6">
                <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason for Rejection</label>
                <textarea 
                  required
                  placeholder="Enter rejection reason to inform cleaner..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border-glass)',
                    background: 'rgba(255,255,255,0.03)',
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
                  onClick={() => setShowRejectModal(false)}
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
                  disabled={submitting}
                  style={{
                    flex: 1.5,
                    padding: 14,
                    borderRadius: 16,
                    border: 'none',
                    background: 'var(--error)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

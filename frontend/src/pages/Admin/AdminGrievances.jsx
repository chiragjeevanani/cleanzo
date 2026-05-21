import { useState, useEffect } from 'react'
import { Search, Calendar, Phone, Mail, FileText, AlertCircle, CheckCircle2, ChevronRight, X, ExternalLink, MessageSquare, Download } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { timeAgo } from '../../utils/helpers'
import { exportToExcel } from '../../utils/excelExporter'

const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed']

export default function AdminGrievances() {
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  
  // Modal / Detail state
  const [selectedGrievance, setSelectedGrievance] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [ticketStatus, setTicketStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    setError('')
    try {
      const filteredExport = grievances.filter(g => {
        const matchesSearch = !search || 
          (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (g.email || '').toLowerCase().includes(search.toLowerCase()) ||
          (g.phone || '').includes(search) ||
          (g.subject || '').toLowerCase().includes(search.toLowerCase())
          
        const matchesStatus = filterStatus === 'All' || g.status === filterStatus
        return matchesSearch && matchesStatus
      })

      exportToExcel({
        data: filteredExport,
        filename: 'Grievances_Export',
        columns: [
          { label: 'Customer Name', key: 'name' },
          { label: 'Customer Phone', key: 'phone' },
          { label: 'Customer Email', key: 'email' },
          { label: 'Subject', key: 'subject' },
          { label: 'Issue Description', key: 'issue' },
          { label: 'Status', key: 'status' },
          { label: 'Internal Notes', key: 'adminNotes' },
          { label: 'Created Date', key: (g) => g.createdAt ? new Date(g.createdAt).toLocaleString() : 'N/A' }
        ]
      })
    } catch (err) {
      setError('Failed to export grievances. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const fetchGrievances = async () => {
    try {
      const res = await apiClient.get('/admin/grievances')
      if (res.success) {
        setGrievances(res.grievances || [])
      }
    } catch (err) {
      setError('Failed to load grievances.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrievances()
  }, [])

  const handleOpenDetail = (g) => {
    setSelectedGrievance(g)
    setAdminNotes(g.adminNotes || '')
    setTicketStatus(g.status || 'Open')
  }

  const handleCloseDetail = () => {
    setSelectedGrievance(null)
  }

  const handleUpdateGrievance = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    try {
      const res = await apiClient.put(`/admin/grievances/${selectedGrievance._id}`, {
        status: ticketStatus,
        adminNotes
      })
      if (res.success) {
        setGrievances(prev => prev.map(item => item._id === selectedGrievance._id ? { ...item, status: ticketStatus, adminNotes } : item))
        handleCloseDetail()
      }
    } catch (err) {
      setError('Failed to update grievance status.')
    } finally {
      setUpdating(false)
    }
  }

  const filtered = grievances.filter(g => {
    const matchesSearch = !search || 
      (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.phone || '').includes(search) ||
      (g.subject || '').toLowerCase().includes(search.toLowerCase())
      
    const matchesStatus = filterStatus === 'All' || g.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) return <div className="skeleton-container" />

  return (
    <div>
      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
          Customer Grievances <span className="text-secondary" style={{ fontSize: 16, fontWeight: 400 }}>({grievances.length})</span>
        </h1>
        <div className="flex items-center gap-12">
          <button 
            disabled={exporting}
            className="btn btn-glass btn-sm text-success" 
            onClick={handleExport}
            style={{ borderColor: 'rgba(50,215,75,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <div className="text-body-sm text-secondary">Manage complaints</div>
        </div>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            className="input-field" 
            placeholder="Search by customer name, phone, email or subject..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ paddingLeft: 40 }} 
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="glass" style={{ padding: 12, marginBottom: 16, borderRadius: 16, display: 'flex', gap: 12, alignItems: 'center', overflowX: 'auto' }}>
         <span className="text-label-xs" style={{ whiteSpace: 'nowrap', marginRight: 12 }}>FILTER BY STATUS:</span>
         {STATUSES.map(s => (
           <button 
             key={s} 
             onClick={() => setFilterStatus(s)} 
             className={`chip ${filterStatus === s ? 'chip-primary' : 'chip-ghost'}`} 
             style={{ textTransform: 'capitalize' }}
           >
             {s}
           </button>
         ))}
      </div>

      {/* Data Table */}
      <div className="glass overflow-visible">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-4 text-secondary">No grievances found.</td></tr>
            ) : filtered.map(g => (
              <tr key={g._id}>
                <td>
                  <div className="flex flex-col">
                    <span style={{ fontWeight: 600 }}>{g.name}</span>
                    <span className="text-secondary" style={{ fontSize: 11 }}>{g.phone}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{g.subject}</span>
                    <span className="text-secondary truncate" style={{ fontSize: 12, maxWidth: 300 }}>{g.issue}</span>
                  </div>
                </td>
                <td>
                  <span className={`chip chip-sm ${
                    g.status === 'Open' ? 'chip-danger' : 
                    g.status === 'In Progress' ? 'chip-warning' : 
                    g.status === 'Resolved' ? 'chip-success' : 'chip-ghost'
                  }`}>
                    {g.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-6 text-secondary" style={{ fontSize: 12 }}>
                    <Calendar size={12} /> {timeAgo(g.createdAt)}
                  </div>
                </td>
                <td>
                  <button 
                    onClick={() => handleOpenDetail(g)} 
                    className="btn btn-glass btn-sm flex items-center gap-4"
                    style={{ fontSize: 12 }}
                  >
                    View Details <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grievance Detail Modal */}
      {selectedGrievance && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass" style={{ width: '100%', maxWidth: 600, borderRadius: 24, padding: 28, position: 'relative', border: '1px solid var(--border-glass)' }}>
            <button 
              onClick={handleCloseDetail} 
              style={{ position: 'absolute', top: 20, right: 20, background: 'var(--bg-glass)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Grievance Details</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
              {/* Customer info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16, borderBottom: '1px solid var(--border-glass)' }}>
                <span className="text-secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Customer</span>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{selectedGrievance.name}</span>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span className="text-secondary flex items-center gap-6" style={{ fontSize: 13 }}><Phone size={12} /> {selectedGrievance.phone}</span>
                  <span className="text-secondary flex items-center gap-6" style={{ fontSize: 13 }}><Mail size={12} /> {selectedGrievance.email}</span>
                </div>
              </div>

              {/* Ticket Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="text-secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Subject</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{selectedGrievance.subject}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="text-secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Issue Description</span>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12 }}>
                  {selectedGrievance.issue}
                </p>
              </div>

              {/* Attachment */}
              {selectedGrievance.attachment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="text-secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Attachment</span>
                  <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-glass)', width: '100%', height: 160 }}>
                    <img 
                      src={selectedGrievance.attachment} 
                      alt="Grievance Attachment" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <a 
                      href={selectedGrievance.attachment} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                    >
                      View Full <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Update Form */}
              <form onSubmit={handleUpdateGrievance} style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Status</label>
                    <select 
                      value={ticketStatus} 
                      onChange={e => setTicketStatus(e.target.value)} 
                      className="input-field"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Internal Admin Notes</label>
                  <textarea 
                    rows={3} 
                    value={adminNotes} 
                    onChange={e => setAdminNotes(e.target.value)} 
                    placeholder="Add internal progress updates, callback logs, etc..."
                    className="input-field"
                    style={{ width: '100%', padding: '12px', borderRadius: 12, resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button 
                    type="button" 
                    onClick={handleCloseDetail} 
                    className="btn btn-glass" 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={updating} 
                    className="btn btn-primary" 
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {updating ? (
                      <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

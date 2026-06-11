import { useState, useEffect } from 'react'
import { Search, Filter, Phone, Mail, Calendar, MapPin, Trash2, CheckCircle2, MessageSquare, Download } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { timeAgo } from '../../utils/helpers'
import { exportToExcel } from '../../utils/excelExporter'

const STATUSES = ['all', 'pending', 'contacted', 'converted', 'rejected']

export default function AdminLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [processingId, setProcessingId] = useState(null)
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    setError('')
    try {
      const filteredExport = leads.filter(l => {
        const matchesSearch = !search || 
          (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (l.requestedSociety || '').toLowerCase().includes(search.toLowerCase()) ||
          (l.phone || '').includes(search)
        const matchesStatus = filterStatus === 'all' || l.status === filterStatus
        return matchesSearch && matchesStatus
      })

      exportToExcel({
        data: filteredExport,
        filename: 'Leads_Export',
        columns: [
          { label: 'Lead Name', key: 'name' },
          { label: 'Phone', key: 'phone' },
          { label: 'Email', key: 'email' },
          { label: 'Requested Society', key: 'requestedSociety' },
          { label: 'Requested Area', key: 'requestedArea' },
          { label: 'City', key: 'city' },
          { label: 'Pincode', key: 'pincode' },
          { label: 'Car Type', key: 'carType' },
          { label: 'Status', key: 'status' },
          { label: 'Notes', key: 'notes' },
          { label: 'Received Date', key: (l) => l.createdAt ? new Date(l.createdAt).toLocaleString() : 'N/A' }
        ]
      })
    } catch (err) {
      setError('Failed to export leads. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const res = await apiClient.get('/admin/leads')
      setLeads(res.leads || [])
    } catch {
      setError('Failed to load leads.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [])

  const handleUpdateLead = async (id, status, notes) => {
    try {
      setProcessingId(id)
      const res = await apiClient.put(`/admin/leads/${id}`, { status, notes })
      if (res.success && res.lead) {
        setLeads(prev => prev.map(l => l._id === id ? res.lead : l))
      } else {
        setLeads(prev => prev.map(l => l._id === id ? { ...l, status, notes } : l))
      }
    } catch {
      setError('Failed to update lead.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return
    try {
      await apiClient.delete(`/admin/leads/${id}`)
      setLeads(prev => prev.filter(l => l._id !== id))
    } catch {
      setError('Failed to delete lead.')
    }
  }

  const filtered = leads.filter(l => {
    const matchesSearch = !search || 
      (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.requestedSociety || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || '').includes(search)
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) return <div className="skeleton-container" />

  return (
    <div>
      {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
          Interest Leads <span className="text-secondary" style={{ fontSize: 16, fontWeight: 400 }}>({leads.length})</span>
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
          <div className="text-body-sm text-secondary" style={{ display: 'none', '@media (min-width: 768px)': { display: 'block' } } /* or keep standard styling */}>
            Capture demand
          </div>
        </div>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input-field" placeholder="Search by name, society or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
      </div>

      <div className="glass" style={{ padding: 12, marginBottom: 16, borderRadius: 16, display: 'flex', gap: 12, alignItems: 'center', overflowX: 'auto' }}>
         <span className="text-label-xs" style={{ whiteSpace: 'nowrap', marginRight: 12 }}>FILTER BY STATUS:</span>
         {STATUSES.map(s => (
           <button key={s} onClick={() => setFilterStatus(s)} className={`chip ${filterStatus === s ? 'chip-primary' : 'chip-ghost'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
         ))}
      </div>

      <div className="glass overflow-visible">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Requested Location</th>
              <th>Contact</th>
              <th>Status</th>
              <th style={{ width: '25%' }}>Notes</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-secondary">No leads found.</td></tr>
            ) : filtered.map(l => (
              <LeadRow 
                key={l._id} 
                lead={l} 
                processingId={processingId} 
                onUpdateLead={handleUpdateLead} 
                onDelete={handleDelete} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeadRow({ lead, processingId, onUpdateLead, onDelete }) {
  const [localNotes, setLocalNotes] = useState(lead.notes || '')

  useEffect(() => {
    setLocalNotes(lead.notes || '')
  }, [lead.notes])

  const handleBlur = () => {
    if (localNotes !== (lead.notes || '')) {
      onUpdateLead(lead._id, lead.status, localNotes)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.target.blur()
    }
  }

  return (
    <tr>
      <td>
        <div className="flex flex-col">
          <span style={{ fontWeight: 600 }}>{lead.name}</span>
          <span className="text-secondary" style={{ fontSize: 11 }}>{lead.email || 'No email'}</span>
        </div>
      </td>
      <td>
        <div className="flex flex-col gap-4">
          <div style={{ fontWeight: 500, fontSize: 13 }}>{lead.requestedSociety}</div>
          <div className="text-secondary" style={{ fontSize: 11 }}>{lead.requestedArea}, {lead.city} {lead.pincode ? `(${lead.pincode})` : ''}</div>
        </div>
      </td>
      <td>
        <div className="flex flex-col gap-4">
          <div style={{ fontSize: 13 }}>{lead.phone}</div>
          <div className="text-secondary" style={{ fontSize: 13 }}>{lead.email}</div>
        </div>
      </td>
      <td>
        <select
          value={lead.status}
          onChange={(e) => onUpdateLead(lead._id, e.target.value, localNotes)}
          disabled={processingId === lead._id}
          style={{
            background: lead.status === 'pending' ? 'rgba(255, 214, 10, 0.12)' :
                        lead.status === 'contacted' ? 'rgba(0, 122, 255, 0.12)' :
                        lead.status === 'converted' ? 'rgba(48, 209, 88, 0.12)' :
                        'rgba(255, 69, 58, 0.12)',
            color: lead.status === 'pending' ? 'var(--warning)' :
                   lead.status === 'contacted' ? 'var(--primary-blue)' :
                   lead.status === 'converted' ? 'var(--success)' :
                   '#FF453A',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '6px 24px 6px 12px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'capitalize',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' viewBox='0 0 24 24' stroke='%238e8e93'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'/></svg>")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            backgroundSize: '10px'
          }}
        >
          <option value="pending" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Pending</option>
          <option value="contacted" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Contacted</option>
          <option value="converted" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Converted</option>
          <option value="rejected" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Rejected</option>
        </select>
      </td>
      <td>
        <textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Add follow-up notes..."
          className="input-field"
          style={{
            fontSize: '12px',
            padding: '6px 10px',
            borderRadius: '8px',
            resize: 'vertical',
            minHeight: '38px',
            maxHeight: '100px',
            width: '100%',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)',
            lineHeight: '1.4'
          }}
        />
      </td>
      <td>
        <div className="flex items-center gap-6 text-secondary" style={{ fontSize: 12 }}>
          <Calendar size={12} /> {timeAgo(lead.createdAt)}
        </div>
      </td>
      <td>
        <button
          className="btn-icon btn-glass btn-sm"
          style={{ color: 'var(--error)' }}
          onClick={() => onDelete(lead._id)}
          title="Delete Lead"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

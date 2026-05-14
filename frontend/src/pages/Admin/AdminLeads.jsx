import { useState, useEffect } from 'react'
import { Search, Filter, Phone, Mail, Calendar, MapPin, Trash2, CheckCircle2, MessageSquare } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { timeAgo } from '../../utils/helpers'

const STATUSES = ['all', 'pending', 'contacted', 'converted']

export default function AdminLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [processingId, setProcessingId] = useState(null)

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

  const handleUpdateStatus = async (id, status) => {
    try {
      setProcessingId(id)
      await apiClient.put(`/admin/leads/${id}`, { status })
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status } : l))
    } catch {
      setError('Failed to update lead status.')
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
        <div className="text-body-sm text-secondary">Capture demand from unserviceable areas</div>
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
            <tr><th>Customer</th><th>Requested Location</th><th>Contact</th><th>Status</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-4 text-secondary">No leads found.</td></tr>
            ) : filtered.map(l => (
              <tr key={l._id}>
                <td>
                  <div className="flex flex-col">
                    <span style={{ fontWeight: 600 }}>{l.name}</span>
                    <span className="text-secondary" style={{ fontSize: 11 }}>{l.email || 'No email'}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-6" style={{ fontWeight: 500, fontSize: 13 }}>
                      <MapPin size={12} className="text-secondary" /> {l.requestedSociety}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 11 }}>{l.requestedArea}, {l.city} {l.pincode ? `(${l.pincode})` : ''}</div>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-6" style={{ fontSize: 13 }}>
                      <Phone size={12} className="text-secondary" /> {l.phone}
                    </div>
                    <div className="flex items-center gap-6" style={{ fontSize: 13 }}>
                      <Mail size={12} className="text-secondary" /> {l.email}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`chip chip-sm ${
                    l.status === 'pending' ? 'chip-warning' : 
                    l.status === 'contacted' ? 'chip-primary' : 'chip-success'
                  }`} style={{ textTransform: 'capitalize' }}>{l.status}</span>
                </td>
                <td>
                  <div className="flex items-center gap-6 text-secondary" style={{ fontSize: 12 }}>
                    <Calendar size={12} /> {timeAgo(l.createdAt)}
                  </div>
                </td>
                <td>
                  <div className="flex gap-8">
                    {l.status === 'pending' && (
                      <button 
                        disabled={processingId === l._id} 
                        className="btn-icon btn-glass btn-sm" 
                        style={{ color: 'var(--primary-blue)' }} 
                        onClick={() => handleUpdateStatus(l._id, 'contacted')}
                        title="Mark as Contacted"
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}
                    {l.status === 'contacted' && (
                      <button 
                        disabled={processingId === l._id} 
                        className="btn-icon btn-glass btn-sm" 
                        style={{ color: 'var(--success)' }} 
                        onClick={() => handleUpdateStatus(l._id, 'converted')}
                        title="Mark as Converted"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button className="btn-icon btn-glass btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(l._id)} title="Delete Lead">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

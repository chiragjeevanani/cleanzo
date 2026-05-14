import { useState, useEffect, useRef } from 'react'
import { Plus, X, Search, Filter, MapPin, Building2, MoreVertical, Trash2, Edit2, Globe } from 'lucide-react'
import apiClient from '../../services/apiClient'

const STATUSES = ['all', 'active', 'inactive']

export default function AdminSocieties() {
  const [societies, setSocieties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSociety, setEditingSociety] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCity, setFilterCity] = useState('')
  const [openMenu, setOpenMenu] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const menuRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    area: '',
    pincode: '',
    address: '',
    isActive: true,
    slots: [
      { slotId: '05_06_AM', timeWindow: '05:00 AM - 06:00 AM', maxVehicles: 20 },
      { slotId: '06_07_AM', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 20 },
      { slotId: '07_08_AM', timeWindow: '07:00 AM - 08:00 AM', maxVehicles: 20 }
    ]
  })

  const fetchSocieties = async () => {
    try {
      const res = await apiClient.get('/admin/societies')
      setSocieties(res.societies || [])
    } catch {
      setError('Failed to load societies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSocieties() }, [])

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleMenuOpen = (e, id) => {
    if (openMenu === id) { setOpenMenu(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpenMenu(id)
  }

  const cities = [...new Set(societies.map(s => s.city).filter(Boolean))]

  const filtered = societies.filter(s => {
    const matchesSearch = !search || 
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.area || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.pincode || '').includes(search)
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && s.isActive) ||
      (filterStatus === 'inactive' && !s.isActive)
    const matchesCity = !filterCity || s.city === filterCity
    return matchesSearch && matchesStatus && matchesCity
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingSociety) {
        const res = await apiClient.put(`/admin/societies/${editingSociety._id}`, formData)
        setSocieties(prev => prev.map(s => s._id === editingSociety._id ? res.society : s))
      } else {
        const res = await apiClient.post('/admin/societies', formData)
        setSocieties(prev => [res.society, ...prev])
      }
      setShowModal(false)
      resetForm()
    } catch (err) {
      setError(err?.message || 'Failed to save society.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/admin/societies/${id}`)
      setSocieties(prev => prev.filter(s => s._id !== id))
    } catch {
      setError('Failed to delete society.')
    }
    setConfirmDelete(null)
  }

  const resetForm = () => {
    setFormData({
      name: '', city: '', area: '', pincode: '', address: '', isActive: true,
      slots: [
        { slotId: '05_06_AM', timeWindow: '05:00 AM - 06:00 AM', maxVehicles: 20 },
        { slotId: '06_07_AM', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 20 },
        { slotId: '07_08_AM', timeWindow: '07:00 AM - 08:00 AM', maxVehicles: 20 }
      ]
    })
    setEditingSociety(null)
  }

  const handleEdit = (society) => {
    setEditingSociety(society)
    setFormData({
      name: society.name,
      city: society.city,
      area: society.area,
      pincode: society.pincode,
      address: society.address,
      isActive: society.isActive,
      slots: society.slots || []
    })
    setShowModal(true)
    setOpenMenu(null)
  }

  if (loading) return <div className="skeleton-container" />

  return (
    <div style={{ position: 'relative' }}>
      {error && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
          Societies <span className="text-secondary" style={{ fontSize: 16, fontWeight: 400 }}>({societies.length})</span>
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus size={16} /> Add Society
        </button>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input-field" placeholder="Search by name, area or pincode..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        <button className={`btn ${showFilters ? 'btn-primary' : 'btn-glass'}`} onClick={() => setShowFilters(v => !v)}>
          <Filter size={16} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="glass" style={{ padding: 16, marginBottom: 16, borderRadius: 16, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="flex flex-col gap-6">
            <label className="text-label-xs">STATUS</label>
            <div className="flex gap-8">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`chip ${filterStatus === s ? 'chip-success' : 'chip-ghost'}`} style={{ textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <label className="text-label-xs">CITY</label>
            <div className="flex gap-8">
              <button onClick={() => setFilterCity('')} className={`chip ${!filterCity ? 'chip-lime' : 'chip-ghost'}`}>All</button>
              {cities.map(c => (
                <button key={c} onClick={() => setFilterCity(c)} className={`chip ${filterCity === c ? 'chip-lime' : 'chip-ghost'}`}>{c}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="glass overflow-visible">
        <table className="data-table">
          <thead>
            <tr><th>Society Name</th><th>Area / City</th><th>Pincode</th><th>Capacity</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-4 text-secondary">No societies found.</td></tr>
            ) : filtered.map(s => (
              <tr key={s._id}>
                <td style={{ fontWeight: 600 }}>
                  <div className="flex items-center gap-10">
                    <div className="icon-circle-sm" style={{ background: 'var(--bg-elevated)' }}><Building2 size={14} /></div>
                    {s.name}
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.area}</span>
                    <span className="text-secondary" style={{ fontSize: 11 }}>{s.city}</span>
                  </div>
                </td>
                <td><code style={{ fontSize: 13, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>{s.pincode}</code></td>
                <td>
                   <div className="flex items-center gap-6">
                     <Globe size={12} className="text-secondary" />
                     <span style={{ fontSize: 13 }}>{s.slots?.length || 0} Slots</span>
                   </div>
                </td>
                <td><span className={`chip ${s.isActive ? 'chip-success' : 'chip-error'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button className="btn-icon btn-ghost" onClick={(e) => handleMenuOpen(e, s._id)}><MoreVertical size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openMenu && (
        <div ref={menuRef} className="glass animate-fade-in" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 1000, minWidth: 160, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)' }}>
          <button onClick={() => handleEdit(societies.find(s => s._id === openMenu))} className="menu-item"><Edit2 size={14} /> Edit Society</button>
          <div className="divider" />
          <button onClick={() => { setConfirmDelete(societies.find(s => s._id === openMenu)); setOpenMenu(null) }} className="menu-item text-error"><Trash2 size={14} /> Delete</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="glass-solid modal-content-lg animate-scale-in" style={{ width: 600, padding: 40 }}>
             <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
                <h2 className="text-display-sm">{editingSociety ? 'Edit Society' : 'Add New Society'}</h2>
                <button className="btn-icon btn-glass" onClick={() => setShowModal(false)}><X size={20} /></button>
             </div>
             <form onSubmit={handleSave} className="grid-2 gap-20">
                <div className="flex flex-col gap-8 span-2">
                   <label className="text-label-xs">SOCIETY NAME *</label>
                   <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Marvel Fria" />
                </div>
                <div className="flex flex-col gap-8">
                   <label className="text-label-xs">CITY *</label>
                   <input required className="input-field" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="e.g. Pune" />
                </div>
                <div className="flex flex-col gap-8">
                   <label className="text-label-xs">PINCODE *</label>
                   <input required className="input-field" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} placeholder="6 digits" maxLength={6} />
                </div>
                <div className="flex flex-col gap-8 span-2">
                   <label className="text-label-xs">AREA / LOCALITY *</label>
                   <input required className="input-field" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder="e.g. Wagholi" />
                </div>
                <div className="flex flex-col gap-8 span-2">
                   <label className="text-label-xs">FULL ADDRESS</label>
                   <textarea className="input-field" style={{ minHeight: 80, padding: 12 }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full physical address..." />
                </div>
                <div className="span-2 pt-16 flex justify-end gap-12">
                   <button type="button" className="btn btn-glass" onClick={() => setShowModal(false)}>Cancel</button>
                   <button disabled={saving} type="submit" className="btn btn-primary">{saving ? 'Saving...' : 'Save Society'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="glass animate-scale-in" style={{ width: 400, padding: 32, textAlign: 'center' }}>
            <div className="icon-circle-lg bg-error-light" style={{ margin: '0 auto 20px' }}><Trash2 size={24} color="var(--error)" /></div>
            <h3 className="text-display-xs">Delete Society?</h3>
            <p className="text-secondary" style={{ margin: '8px 0 24px' }}>Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-error w-full" onClick={() => handleDelete(confirmDelete._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

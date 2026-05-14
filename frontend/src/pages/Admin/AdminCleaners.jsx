import { useState, useEffect, useRef, useCallback } from 'react'
import { Star, MapPin, MoreVertical, Plus, X, Trash2, UserX, UserCheck, Filter, Search } from 'lucide-react'
import apiClient from '../../services/apiClient'

const STATUSES = ['all', 'active', 'inactive']

export default function AdminCleaners() {
  const [cleaners, setCleaners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterArea, setFilterArea] = useState('')
  const [openMenu, setOpenMenu] = useState(null)   // cleaner._id
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const menuRef = useRef(null)

  const [formData, setFormData] = useState({ 
    name: '', phone: '', email: '', age: '', city: '', assignedArea: '',
    fatherName: '', currentAddress: '', permanentAddress: '',
    referenceName: '', referencePhone: ''
  })

  const fetchCleaners = async () => {
    try {
      const res = await apiClient.get('/admin/cleaners')
      setCleaners(res.cleaners || [])
    } catch {
      setError('Failed to load cleaners.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCleaners() }, [])

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

  const areas = [...new Set(cleaners.map(c => c.assignedArea).filter(Boolean))]

  const filtered = cleaners.filter(c => {
    const matchesSearch = !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && c.isActive) ||
      (filterStatus === 'inactive' && !c.isActive)
    const matchesArea = !filterArea || c.assignedArea === filterArea
    return matchesSearch && matchesStatus && matchesArea
  })

  const handleToggleActive = async (cleaner) => {
    try {
      await apiClient.put(`/admin/cleaners/${cleaner._id}`, { isActive: !cleaner.isActive })
      setCleaners(prev => prev.map(c => c._id === cleaner._id ? { ...c, isActive: !c.isActive } : c))
    } catch {
      setError('Failed to update cleaner status. Please try again.')
    }
    setOpenMenu(null)
  }

  const handleDelete = async (cleanerId) => {
    try {
      await apiClient.delete(`/admin/cleaners/${cleanerId}`)
      setCleaners(prev => prev.filter(c => c._id !== cleanerId))
    } catch {
      setError('Failed to deactivate cleaner. Please try again.')
    }
    setConfirmDelete(null)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await apiClient.post('/admin/cleaners', formData)
      setCleaners(prev => [res.cleaner, ...prev])
      setShowAddModal(false)
      setFormData({ 
        name: '', phone: '', email: '', age: '', city: '', assignedArea: '',
        fatherName: '', currentAddress: '', permanentAddress: '',
        referenceName: '', referencePhone: ''
      })
    } catch (err) {
      setError(err?.message || 'Failed to add cleaner. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const activeFiltersCount = (filterStatus !== 'all' ? 1 : 0) + (filterArea ? 1 : 0)
  const activeMenu = openMenu ? cleaners.find(c => c._id === openMenu) : null

  if (loading) return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 32, width: 160, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 36, width: 120, borderRadius: 8 }} />
      </div>
      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 44, flex: 1, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 44, width: 80, borderRadius: 12 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[0,1,2,3,4,5].map(i => <div key={i} className="glass skeleton" style={{ height: 160, borderRadius: 16 }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
          Cleaners <span className="text-secondary" style={{ fontSize: 16, fontWeight: 400 }}>({cleaners.length})</span>
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Cleaner
        </button>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input-field" placeholder="Search cleaners..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        <button
          className={`btn ${showFilters ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setShowFilters(v => !v)}
          style={{ position: 'relative' }}
        >
          <Filter size={16} /> Filters
          {activeFiltersCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--error)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel — sits in normal flow, z-index above table */}
      {showFilters && (
        <div className="glass" style={{ padding: '16px 20px', marginBottom: 16, borderRadius: 16, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div className="flex flex-col gap-6">
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>STATUS</label>
            <div className="flex gap-8">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`chip ${filterStatus === s ? 'chip-success' : 'chip-ghost'}`}
                  style={{ cursor: 'pointer', textTransform: 'capitalize' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {areas.length > 0 && (
            <div className="flex flex-col gap-6">
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>AREA</label>
              <div className="flex gap-8 flex-wrap">
                <button onClick={() => setFilterArea('')}
                  className={`chip ${!filterArea ? 'chip-lime' : 'chip-ghost'}`}
                  style={{ cursor: 'pointer' }}>All</button>
                {areas.map(a => (
                  <button key={a} onClick={() => setFilterArea(a)}
                    className={`chip ${filterArea === a ? 'chip-lime' : 'chip-ghost'}`}
                    style={{ cursor: 'pointer' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeFiltersCount > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setFilterStatus('all'); setFilterArea('') }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="glass" style={{ overflow: 'visible' }}>
        <table className="data-table" style={{ overflow: 'visible' }}>
          <thead>
            <tr><th>Name</th><th>Area</th><th>Rating</th><th>Completion</th><th>Total Tasks</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-secondary">No cleaners found.</td></tr>
            ) : filtered.map(c => (
              <tr key={c._id}>
                <td style={{ fontWeight: 500 }}>{c.name || 'Cleaner'}</td>
                <td className="text-secondary"><span className="flex items-center gap-4"><MapPin size={12} />{c.assignedArea || 'Unassigned'}</span></td>
                <td><span className="flex items-center gap-4"><Star size={12} style={{ color: 'var(--accent-lime)' }} />{c.rating?.toFixed(1) || '0.0'}</span></td>
                <td>
                  <div className="flex items-center gap-8">
                    <div className="progress-track" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${c.completionRate || 0}%` }} /></div>
                    <span className="text-body-sm">{c.completionRate || 0}%</span>
                  </div>
                </td>
                <td>{c.totalCompleted?.toLocaleString() || 0}</td>
                <td><span className={`chip ${c.isActive ? 'chip-success' : 'chip-error'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button
                    style={{ color: 'var(--text-tertiary)', padding: 4 }}
                    onClick={(e) => handleMenuOpen(e, c._id)}
                  >
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dropdown — fixed position, escapes table overflow */}
      {openMenu && activeMenu && (
        <div ref={menuRef} className="glass animate-fade-in" style={{
          position: 'fixed',
          top: menuPos.top,
          right: menuPos.right,
          zIndex: 1000,
          minWidth: 190,
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <button
            onClick={() => handleToggleActive(activeMenu)}
            className="flex items-center gap-10"
            style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: activeMenu.isActive ? 'var(--warning)' : 'var(--success)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {activeMenu.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
            {activeMenu.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <div style={{ height: 1, background: 'var(--divider)' }} />
          <button
            onClick={() => { setConfirmDelete(activeMenu); setOpenMenu(null) }}
            className="flex items-center gap-10"
            style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Trash2 size={15} /> Delete Cleaner
          </button>
        </div>
      )}

      {/* Add Cleaner Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 700, padding: '40px 48px', borderRadius: 36,
            border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 200, height: 200, background: 'var(--accent-lime)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div className="flex justify-between items-start" style={{ marginBottom: 32 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Add Cleaner</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Register a new crew member</p>
              </div>
              <button className="glass flex items-center justify-center" onClick={() => setShowAddModal(false)}
                style={{ width: 40, height: 40, borderRadius: 14 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-24" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
              {/* Personal Info Section */}
              <section className="space-y-16">
                <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>PERSONAL INFO</h4>
                <div className="grid-2 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FULL NAME *</label>
                    <input required className="input-field" placeholder="Ravi Kumar" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FATHER'S NAME</label>
                    <input className="input-field" placeholder="Suresh Kumar" value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} />
                  </div>
                </div>
                <div className="grid-3 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>PHONE *</label>
                    <input required className="input-field" placeholder="9876543210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>EMAIL</label>
                    <input type="email" className="input-field" placeholder="ravi@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>AGE</label>
                    <input type="number" className="input-field" placeholder="25" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>CITY *</label>
                    <input required className="input-field" placeholder="Mumbai" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>ASSIGNED AREA</label>
                    <input className="input-field" placeholder="Andheri West" value={formData.assignedArea} onChange={e => setFormData({ ...formData, assignedArea: e.target.value })} />
                  </div>
                </div>
              </section>

              {/* Address Section */}
              <section className="space-y-16">
                <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ADDRESS DETAILS</h4>
                <div className="flex flex-col gap-6">
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>CURRENT ADDRESS</label>
                  <textarea className="input-field" placeholder="House No, Street, Landmark..." value={formData.currentAddress} onChange={e => setFormData({ ...formData, currentAddress: e.target.value })} style={{ minHeight: 60 }} />
                </div>
                <div className="flex flex-col gap-6">
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>PERMANENT ADDRESS</label>
                  <textarea className="input-field" placeholder="Same as current or other..." value={formData.permanentAddress} onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })} style={{ minHeight: 60 }} />
                </div>
              </section>

              {/* Reference Section */}
              <section className="space-y-16">
                <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>LOCAL REFERENCE</h4>
                <div className="grid-2 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>REFERENCE NAME</label>
                    <input className="input-field" placeholder="Contact Person Name" value={formData.referenceName} onChange={e => setFormData({ ...formData, referenceName: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>REFERENCE PHONE</label>
                    <input className="input-field" placeholder="Contact Person Phone" value={formData.referencePhone} onChange={e => setFormData({ ...formData, referencePhone: e.target.value })} />
                  </div>
                </div>
              </section>

              <button disabled={saving} className="btn btn-primary w-full" type="submit"
                style={{ padding: '16px', borderRadius: 20, fontSize: 16, fontWeight: 700, marginTop: 8 }}>
                {saving ? 'Creating...' : 'Add Cleaner Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 420, padding: '40px 48px', borderRadius: 32,
            border: '1px solid rgba(255,50,50,0.2)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            textAlign: 'center'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,50,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Trash2 size={24} color="var(--error)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Delete Cleaner?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 28 }}>
              This will permanently delete <strong>{confirmDelete.name || 'this cleaner'}</strong> and cannot be undone.
            </p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn w-full" style={{ background: 'var(--error)', color: '#fff', borderRadius: 14 }} onClick={() => handleDelete(confirmDelete._id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = `
  .space-y-16 > * + * { margin-top: 16px; }
  form::-webkit-scrollbar { width: 4px; }
  form::-webkit-scrollbar-track { background: transparent; }
  form::-webkit-scrollbar-thumb { background: var(--divider); border-radius: 10px; }
`
const styleTag = document.createElement('style')
styleTag.textContent = styles
document.head.appendChild(styleTag)

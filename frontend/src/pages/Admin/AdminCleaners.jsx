import { useState, useEffect, useRef } from 'react'
import { Star, MapPin, MoreVertical, Plus, X, Trash2, UserX, UserCheck, Filter, Search, Eye, EyeOff, Download, Edit, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/apiClient'
import { exportToExcel } from '../../utils/excelExporter'
import { validateName, validateEmail, validatePhone, cleanPhoneNumber, formatCityState } from '../../utils/helpers'

const STATUSES = ['all', 'active', 'inactive']

export default function AdminCleaners() {
  const [cleaners, setCleaners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null) // cleaner object
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterArea, setFilterArea] = useState('')
  const [openMenu, setOpenMenu] = useState(null)   // cleaner._id
  const [menuPos, setMenuPos] = useState({ top: 0, bottom: null, right: 0 })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [globalPayoutRate, setGlobalPayoutRate] = useState(500)
  const [showGlobalPayoutModal, setShowGlobalPayoutModal] = useState(false)
  const [globalPayoutInput, setGlobalPayoutInput] = useState('500')
  const [globalPayoutSaving, setGlobalPayoutSaving] = useState(false)
  const [formData, setFormData] = useState({ 
    name: '', phone: '', email: '', age: '', city: '', assignedArea: '', dailyRate: '',
    fatherName: '', currentAddress: '', permanentAddress: '',
    referenceName: '', referencePhone: ''
  })
  const menuRef = useRef(null)

  const openEditCleaner = (cleaner) => {
    setFormData({
      name: cleaner.name || '',
      phone: cleaner.phone || '',
      email: cleaner.email || '',
      age: cleaner.age || '',
      city: cleaner.city || '',
      assignedArea: cleaner.assignedArea || '',
      dailyRate: cleaner.dailyRate !== null && cleaner.dailyRate !== undefined ? cleaner.dailyRate : '',
      fatherName: cleaner.fatherName || '',
      currentAddress: cleaner.currentAddress || '',
      permanentAddress: cleaner.permanentAddress || '',
      referenceName: cleaner.localReference?.name || '',
      referencePhone: cleaner.localReference?.phone || ''
    })
    setShowEditModal(cleaner)
    setOpenMenu(null)
  }


  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await apiClient.get('/admin/cleaners?limit=all')
      const allCleaners = res.cleaners || []
      
      const filteredExport = allCleaners.filter(c => {
        const matchesSearch = !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.phone && c.phone.includes(search))
        const matchesStatus = filterStatus === 'all' ||
          (filterStatus === 'active' && c.isActive) ||
          (filterStatus === 'inactive' && !c.isActive)
        const matchesArea = !filterArea || c.assignedArea === filterArea
        return matchesSearch && matchesStatus && matchesArea
      })

      exportToExcel({
        data: filteredExport,
        filename: 'Cleaners_Export',
        columns: [
          { label: 'Full Name', key: 'name' },
          { label: 'Phone Number', key: 'phone' },
          { label: 'Email Address', key: 'email' },
          { label: 'Age', key: 'age' },
          { label: 'City', key: 'city' },
          { label: 'Assigned Area', key: 'assignedArea' },
          { label: 'Father\'s Name', key: 'fatherName' },
          { label: 'Current Address', key: 'currentAddress' },
          { label: 'Permanent Address', key: 'permanentAddress' },
          { label: 'Reference Name', key: 'referenceName' },
          { label: 'Reference Phone', key: 'referencePhone' },
          { label: 'Rating (Out of 5)', key: 'rating' },
          { label: 'Completion Rate', key: (c) => `${c.completionRate || 0}%` },
          { label: 'Total Completed Tasks', key: 'totalCompleted' },
          { label: 'KYC Status', key: 'kycStatus' },
          { label: 'Account Status', key: (c) => c.isActive ? 'Active' : 'Inactive' },
          { label: 'Registered Date', key: (c) => c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A' }
        ]
      })
    } catch (err) {
      setError('Failed to export cleaner records. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const fetchCleaners = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/admin/cleaners')
      setCleaners(res.cleaners || [])
      
      const settingsRes = await apiClient.get('/admin/settings')
      const globalSetting = settingsRes.settings?.find(s => s.key === 'globalCleanerPayoutRate')
      if (globalSetting) {
        setGlobalPayoutRate(globalSetting.value)
        setGlobalPayoutInput(String(globalSetting.value))
      }
    } catch {
      setError('Failed to load cleaners or settings.')
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
    const MENU_HEIGHT = 200       // approx height of the 4-item action menu
    const BOTTOM_RESERVED = 88    // fixed bottom nav bar + safe-area breathing room
    const right = window.innerWidth - rect.right
    const spaceBelow = window.innerHeight - rect.bottom - BOTTOM_RESERVED
    if (spaceBelow < MENU_HEIGHT) {
      // Not enough room below — flip the menu upward so its lower items aren't
      // clipped by the viewport edge / bottom menu bar.
      setMenuPos({ bottom: window.innerHeight - rect.top + 4, top: null, right })
    } else {
      setMenuPos({ top: rect.bottom + 4, bottom: null, right })
    }
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

  const handleSaveGlobalPayout = async () => {
    const rate = parseFloat(globalPayoutInput)
    if (!globalPayoutInput || isNaN(rate) || rate <= 0) return
    setGlobalPayoutSaving(true)
    try {
      await apiClient.put('/admin/settings/globalCleanerPayoutRate', { value: rate })
      setGlobalPayoutRate(rate)
      setShowGlobalPayoutModal(false)
    } catch (err) {
      setError(err?.message || 'Failed to update global payout rate.')
    } finally {
      setGlobalPayoutSaving(false)
    }
  }

  const validateCleanerForm = (data) => {
    if (!data.name?.trim()) return 'Full Name is required'
    if (!validateName(data.name)) return 'Full Name must contain only alphabetic characters'
    
    if (data.fatherName && !validateName(data.fatherName)) return 'Father Name must contain only alphabetic characters'
    
    if (!data.phone?.trim()) return 'Phone number is required'
    if (!validatePhone(data.phone)) return 'Please enter a valid 10-digit phone number (can start with 91)'
    
    if (data.email && !validateEmail(data.email)) return 'Please enter a valid email address'
    
    if (!data.city?.trim()) return 'City is required'
    if (!validateName(data.city)) return 'City name must contain only alphabetic characters'
    
    if (data.referenceName && !validateName(data.referenceName)) return 'Reference Name must contain only alphabetic characters'
    
    if (data.referencePhone && !validatePhone(data.referencePhone)) return 'Reference Phone must be a valid 10-digit number (can start with 91)'

    if (data.age !== '' && data.age != null) {
      const age = Number(data.age)
      if (!Number.isFinite(age) || age <= 0) return 'Age must be a valid number greater than 0'
      if (age < 18 || age > 70) return 'Age must be between 18 and 70'
    }

    if (data.dailyRate !== '' && data.dailyRate != null) {
      const rate = Number(data.dailyRate)
      if (!Number.isFinite(rate) || rate < 1) return 'Daily payout rate must be at least ₹1'
    }

    if (data.currentAddress && data.currentAddress.trim()) {
      if (!/[a-zA-Z0-9]/.test(data.currentAddress)) return 'Current Address details must contain at least one letter or digit'
    }
    if (data.permanentAddress && data.permanentAddress.trim()) {
      if (!/[a-zA-Z0-9]/.test(data.permanentAddress)) return 'Permanent Address details must contain at least one letter or digit'
    }

    return null
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validateCleanerForm(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        phone: cleanPhoneNumber(formData.phone),
        referencePhone: formData.referencePhone ? cleanPhoneNumber(formData.referencePhone) : '',
        city: formatCityState(formData.city),
        dailyRate: formData.dailyRate !== '' && formData.dailyRate !== undefined ? Number(formData.dailyRate) : null
      }
      const res = await apiClient.post('/admin/cleaners', payload)
      setCleaners(prev => [res.cleaner, ...prev])
      setShowAddModal(false)
      setFormData({ 
        name: '', phone: '', email: '', age: '', city: '', assignedArea: '', dailyRate: '',
        fatherName: '', currentAddress: '', permanentAddress: '',
        referenceName: '', referencePhone: ''
      })
    } catch (err) {
      setError(err?.message || 'Failed to add cleaner. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validateCleanerForm(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        phone: cleanPhoneNumber(formData.phone),
        referencePhone: formData.referencePhone ? cleanPhoneNumber(formData.referencePhone) : '',
        city: formatCityState(formData.city),
        dailyRate: formData.dailyRate !== '' && formData.dailyRate !== undefined ? Number(formData.dailyRate) : null
      }
      const res = await apiClient.put(`/admin/cleaners/${showEditModal._id}`, payload)
      setCleaners(prev => prev.map(c => c._id === showEditModal._id ? res.cleaner : c))
      setShowEditModal(null)
      setFormData({ 
        name: '', phone: '', email: '', age: '', city: '', assignedArea: '', dailyRate: '',
        fatherName: '', currentAddress: '', permanentAddress: '',
        referenceName: '', referencePhone: ''
      })
    } catch (err) {
      setError(err?.message || 'Failed to update cleaner. Please try again.')
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
        <div className="flex gap-8">
          <button 
            disabled={exporting}
            className="btn btn-glass btn-sm text-success" 
            onClick={handleExport}
            style={{ borderColor: 'rgba(50,215,75,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            className="btn btn-glass btn-sm"
            onClick={() => { setGlobalPayoutInput(String(globalPayoutRate)); setShowGlobalPayoutModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'rgba(147,112,219,0.35)', color: 'var(--text-secondary)' }}
            title="Set global payout rate for all cleaners"
          >
            <Settings2 size={16} style={{ color: '#b695f8' }} />
            <span>Global Payout</span>
            <span style={{ background: 'rgba(147,112,219,0.18)', color: '#b695f8', borderRadius: 8, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>₹{globalPayoutRate}</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Cleaner
          </button>
        </div>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input-field" placeholder="Search cleaners..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        <button
          className={`btn ${showFilters ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setShowFilters(v => !v)}
          style={{ position: 'relative', overflow: 'visible' }}
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

      <div className="glass" style={{ overflow: 'visible', borderRadius: 16 }}>
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
          ...(menuPos.bottom != null ? { bottom: menuPos.bottom } : { top: menuPos.top }),
          right: menuPos.right,
          zIndex: 1000,
          minWidth: 190,
          borderRadius: 14,
          overflow: 'visible',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <Link
            to={`/admin/cleaners/${activeMenu._id}`}
            className="flex items-center gap-10"
            style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
          >
            <Eye size={15} /> View Details
          </Link>
          <div style={{ height: 1, background: 'var(--divider)' }} />
          <button
            onClick={() => openEditCleaner(activeMenu)}
            className="flex items-center gap-10"
            style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Edit size={15} /> Edit Details
          </button>
          <div style={{ height: 1, background: 'var(--divider)' }} />
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
                    <input required className="input-field" placeholder="Ravi Kumar" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FATHER'S NAME</label>
                    <input className="input-field" placeholder="Suresh Kumar" value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                </div>
                <div className="grid-3 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>PHONE *</label>
                    <input required className="input-field" placeholder="9876543210" maxLength={10} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>EMAIL</label>
                    <input type="email" className="input-field" placeholder="ravi@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>AGE</label>
                    <input type="number" min="18" max="70" className="input-field" placeholder="25" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                </div>
                 <div className="grid-3 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>CITY *</label>
                    <input required className="input-field" placeholder="Mumbai" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>ASSIGNED AREA</label>
                    <input className="input-field" placeholder="Andheri West" value={formData.assignedArea} onChange={e => setFormData({ ...formData, assignedArea: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>DAILY PAYOUT RATE (₹)
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: '#b695f8', background: 'rgba(147,112,219,0.12)', borderRadius: 6, padding: '1px 6px' }}>Optional</span>
                    </label>
                    <input type="number" min="1" className="input-field" placeholder={`Uses global rate: ₹${globalPayoutRate}`} value={formData.dailyRate} onChange={e => setFormData({ ...formData, dailyRate: e.target.value })} />
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
                    <input className="input-field" placeholder="Contact Person Name" value={formData.referenceName} onChange={e => setFormData({ ...formData, referenceName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>REFERENCE PHONE</label>
                    <input className="input-field" placeholder="Contact Person Phone" maxLength={10} value={formData.referencePhone} onChange={e => setFormData({ ...formData, referencePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
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

      {/* Edit Cleaner Modal */}
      {showEditModal && (
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
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Edit Cleaner</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Update crew member details</p>
              </div>
              <button className="glass flex items-center justify-center" onClick={() => setShowEditModal(null)}
                style={{ width: 40, height: 40, borderRadius: 14 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-24" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
              {/* Personal Info Section */}
              <section className="space-y-16">
                <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>PERSONAL INFO</h4>
                <div className="grid-2 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FULL NAME *</label>
                    <input required className="input-field" placeholder="Ravi Kumar" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FATHER'S NAME</label>
                    <input className="input-field" placeholder="Suresh Kumar" value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                </div>
                <div className="grid-3 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>PHONE *</label>
                    <input required className="input-field" placeholder="9876543210" maxLength={10} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>EMAIL</label>
                    <input type="email" className="input-field" placeholder="ravi@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>AGE</label>
                    <input type="number" min="18" max="70" className="input-field" placeholder="25" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                </div>
                <div className="grid-3 gap-16">
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>CITY *</label>
                    <input required className="input-field" placeholder="Mumbai" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>ASSIGNED AREA</label>
                    <input className="input-field" placeholder="Andheri West" value={formData.assignedArea} onChange={e => setFormData({ ...formData, assignedArea: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>DAILY PAYOUT RATE (₹)
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: '#b695f8', background: 'rgba(147,112,219,0.12)', borderRadius: 6, padding: '1px 6px' }}>Optional</span>
                    </label>
                    <input type="number" min="1" className="input-field" placeholder={`Uses global rate: ₹${globalPayoutRate}`} value={formData.dailyRate} onChange={e => setFormData({ ...formData, dailyRate: e.target.value })} />
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
                    <input className="input-field" placeholder="Contact Person Name" value={formData.referenceName} onChange={e => setFormData({ ...formData, referenceName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
                  </div>
                  <div className="flex flex-col gap-6">
                    <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>REFERENCE PHONE</label>
                    <input className="input-field" placeholder="Contact Person Phone" maxLength={10} value={formData.referencePhone} onChange={e => setFormData({ ...formData, referencePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </div>
                </div>
              </section>

              <button disabled={saving} className="btn btn-primary w-full" type="submit"
                style={{ padding: '16px', borderRadius: 20, fontSize: 16, fontWeight: 700, marginTop: 8 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Payout Rate Modal */}
      {showGlobalPayoutModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 440, padding: '40px 48px', borderRadius: 32,
            border: '1px solid rgba(147,112,219,0.3)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: 220, height: 220, background: '#7c3aed', opacity: 0.06, filter: 'blur(60px)', pointerEvents: 'none' }} />

            <div className="flex justify-between items-start" style={{ marginBottom: 28 }}>
              <div>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(147,112,219,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Settings2 size={22} style={{ color: '#b695f8' }} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Global Payout Rate</h2>
                <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>Default daily rate applied to all cleaners without a custom rate</p>
              </div>
              <button className="glass flex items-center justify-center" onClick={() => setShowGlobalPayoutModal(false)}
                style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-8" style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.08em' }}>DAILY RATE (₹ PER DAY)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#b695f8', fontWeight: 700, fontSize: 16, pointerEvents: 'none' }}>₹</span>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  placeholder="e.g. 500"
                  value={globalPayoutInput}
                  onChange={e => setGlobalPayoutInput(e.target.value)}
                  style={{ paddingLeft: 36, fontSize: 20, fontWeight: 700 }}
                  autoFocus
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Currently set to <strong style={{ color: '#b695f8' }}>₹{globalPayoutRate}</strong> per day.
                Cleaners with a custom payout rate will not be affected.
              </p>
            </div>

            <div className="flex gap-12">
              <button type="button" className="btn btn-glass w-full" onClick={() => setShowGlobalPayoutModal(false)}>Cancel</button>
              <button
                type="button"
                disabled={globalPayoutSaving || !globalPayoutInput || parseFloat(globalPayoutInput) <= 0}
                onClick={handleSaveGlobalPayout}
                className="btn w-full"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #9f67f8)', color: '#fff', borderRadius: 14, fontWeight: 700 }}
              >
                {globalPayoutSaving ? 'Saving...' : 'Save Rate'}
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

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Search, Filter, MapPin, Building2, MoreVertical, Trash2, Edit2, Globe, Download, Wallet, Check, Ban, AlertCircle, RefreshCw, Eye } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { exportToExcel } from '../../utils/excelExporter'

const STATUSES = ['all', 'active', 'inactive']

export default function AdminSocieties() {
  const [activeTab, setActiveTab] = useState('societies') // 'societies' | 'partners' | 'payouts'
  const [societies, setSocieties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  
  // Societies tab states
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
  const [exporting, setExporting] = useState(false)

  // Society Towers & Blocks Form Data
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
    ],
    towers: []
  })

  // Partner Societies Tab States
  const [partners, setPartners] = useState([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [partnerSaving, setPartnerSaving] = useState(false)
  const [partnerError, setPartnerError] = useState('')
  const [partnerFormData, setPartnerFormData] = useState({
    societyId: '',
    contactName: '',
    email: '',
    password: '',
    phone: '',
    commissionRate: 5,
    isActive: true
  })
  const [confirmDeletePartner, setConfirmDeletePartner] = useState(null)
  
  // Commissions Modal
  const [viewingCommissionsPartner, setViewingCommissionsPartner] = useState(null)
  const [commissions, setCommissions] = useState([])
  const [commissionsLoading, setCommissionsLoading] = useState(false)
  const [commissionsPage, setCommissionsPage] = useState(1)
  const [commissionsTotalPages, setCommissionsTotalPages] = useState(1)
  const [commissionsTotal, setCommissionsTotal] = useState(0)

  // Payout Requests Tab States
  const [payoutRequests, setPayoutRequests] = useState([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [payoutError, setPayoutError] = useState('')
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState(null)
  const [payoutAction, setPayoutAction] = useState('approve') // 'approve' | 'reject'
  const [adminRemark, setAdminRemark] = useState('')
  const [processingPayout, setProcessingPayout] = useState(false)

  // Fetch all societies
  const fetchSocieties = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/admin/societies')
      setSocieties(res.societies || [])
    } catch {
      setError('Failed to load societies.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch partner societies
  const fetchPartners = async () => {
    try {
      setPartnersLoading(true)
      const res = await apiClient.get('/admin/partner-societies')
      setPartners(res.partners || [])
    } catch {
      setPartnerError('Failed to load partner societies.')
    } finally {
      setPartnersLoading(false)
    }
  }

  // Fetch payout requests
  const fetchPayoutRequests = async () => {
    try {
      setPayoutsLoading(true)
      const res = await apiClient.get('/admin/payout-requests?status=all')
      setPayoutRequests(res.requests || [])
    } catch {
      setPayoutError('Failed to load payout requests.')
    } finally {
      setPayoutsLoading(false)
    }
  }

  // Load correct data based on tab
  useEffect(() => {
    if (activeTab === 'societies') {
      fetchSocieties()
    } else if (activeTab === 'partners') {
      fetchPartners()
      // also fetch societies if empty so dropdown works
      if (societies.length === 0) fetchSocieties()
    } else if (activeTab === 'payouts') {
      fetchPayoutRequests()
    }
  }, [activeTab])

  // Context menu close listener
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

  // All societies search filter
  const filteredSocieties = societies.filter(s => {
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

  // Partner societies search filter
  const filteredPartners = partners.filter(p => {
    const sName = p.society?.name || ''
    const cName = p.contactName || ''
    const email = p.email || ''
    const matchesSearch = !search ||
      sName.toLowerCase().includes(search.toLowerCase()) ||
      cName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  // Payout requests search filter
  const filteredPayouts = payoutRequests.filter(pr => {
    const sName = pr.partnerSociety?.society?.name || ''
    const cName = pr.partnerSociety?.contactName || ''
    const matchesSearch = !search ||
      sName.toLowerCase().includes(search.toLowerCase()) ||
      cName.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  // Export societies to Excel
  const handleExport = () => {
    setExporting(true)
    setError('')
    try {
      exportToExcel({
        data: filteredSocieties,
        filename: 'Societies_Export',
        columns: [
          { label: 'Society Name', key: 'name' },
          { label: 'City', key: 'city' },
          { label: 'Area', key: 'area' },
          { label: 'Pincode', key: 'pincode' },
          { label: 'Full Address', key: 'address' },
          { label: 'Towers Count', key: (s) => (s.towers || []).length },
          { label: 'Towers List', key: (s) => (s.towers || []).map(t => `${t.name} (${(t.blocks || []).join('/')})`).join(', ') },
          { label: 'Active Slots', key: (s) => (s.slots || []).map(slot => slot.timeWindow || slot.slotId).join(', ') },
          { label: 'Cleaners Assigned', key: (s) => (s.cleaners || []).map(c => typeof c === 'object' ? c.name : c).filter(Boolean).join(', ') },
          { label: 'Status', key: (s) => s.isActive ? 'Active' : 'Inactive' },
          { label: 'Created Date', key: (s) => s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A' }
        ]
      })
    } catch (err) {
      setError('Failed to export society records. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ─── SOCIETY PORTAL & TOWERS FORM OPERATIONS ─────────────────
  const handleAddTower = () => {
    setFormData(prev => ({
      ...prev,
      towers: [...(prev.towers || []), { name: '', blocks: [] }]
    }))
  }

  const handleRemoveTower = (idx) => {
    setFormData(prev => ({
      ...prev,
      towers: prev.towers.filter((_, i) => i !== idx)
    }))
  }

  const handleTowerNameChange = (idx, name) => {
    setFormData(prev => {
      const copy = [...prev.towers]
      copy[idx] = { ...copy[idx], name }
      return { ...prev, towers: copy }
    })
  }

  const handleTowerBlocksChange = (idx, value) => {
    setFormData(prev => {
      const copy = [...prev.towers]
      copy[idx] = { 
        ...copy[idx], 
        blocks: value.split(',').map(b => b.trim())
      }
      return { ...prev, towers: copy }
    })
  }

  const resetForm = () => {
    setFormData({
      name: '', city: '', area: '', pincode: '', address: '', isActive: true,
      slots: [
        { slotId: '05_06_AM', timeWindow: '05:00 AM - 06:00 AM', maxVehicles: 20 },
        { slotId: '06_07_AM', timeWindow: '06:00 AM - 07:00 AM', maxVehicles: 20 },
        { slotId: '07_08_AM', timeWindow: '07:00 AM - 08:00 AM', maxVehicles: 20 }
      ],
      towers: []
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
      slots: society.slots || [],
      towers: society.towers || []
    })
    setShowModal(true)
    setOpenMenu(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const cleanedTowers = (formData.towers || []).map(t => ({
        name: t.name.trim(),
        blocks: t.blocks ? t.blocks.map(b => b.trim()).filter(Boolean) : []
      })).filter(t => t.name)
      
      const payload = {
        ...formData,
        towers: cleanedTowers
      }

      if (editingSociety) {
        const res = await apiClient.put(`/admin/societies/${editingSociety._id}`, payload)
        setSocieties(prev => prev.map(s => s._id === editingSociety._id ? res.society : s))
      } else {
        const res = await apiClient.post('/admin/societies', payload)
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

  // ─── PARTNER SOCIETIES OPERATIONS ─────────────────────────
  const resetPartnerForm = () => {
    setPartnerFormData({
      societyId: '',
      contactName: '',
      email: '',
      password: '',
      phone: '',
      commissionRate: 5,
      isActive: true
    })
    setEditingPartner(null)
  }

  const handleOpenAddPartner = () => {
    resetPartnerForm()
    setPartnerError('')
    setShowPartnerModal(true)
  }

  const handleOpenEditPartner = (partner) => {
    setEditingPartner(partner)
    setPartnerFormData({
      societyId: partner.society?._id || partner.society,
      contactName: partner.contactName,
      email: partner.email,
      password: '', // blank by default
      phone: partner.phone || '',
      commissionRate: partner.commissionRate ?? 5,
      isActive: partner.isActive
    })
    setPartnerError('')
    setShowPartnerModal(true)
  }

  const handleSavePartner = async (e) => {
    e.preventDefault()
    setPartnerSaving(true)
    setPartnerError('')
    try {
      if (editingPartner) {
        const payload = {
          contactName: partnerFormData.contactName,
          phone: partnerFormData.phone,
          commissionRate: Number(partnerFormData.commissionRate),
          isActive: partnerFormData.isActive
        }
        if (partnerFormData.password) {
          payload.newPassword = partnerFormData.password
        }
        const res = await apiClient.put(`/admin/partner-societies/${editingPartner._id}`, payload)
        setPartners(prev => prev.map(p => p._id === editingPartner._id ? res.partner : p))
      } else {
        const payload = {
          societyId: partnerFormData.societyId,
          contactName: partnerFormData.contactName,
          email: partnerFormData.email,
          password: partnerFormData.password,
          phone: partnerFormData.phone,
          commissionRate: Number(partnerFormData.commissionRate)
        }
        const res = await apiClient.post('/admin/partner-societies', payload)
        setPartners(prev => [res.partner, ...prev])
      }
      setShowPartnerModal(false)
      resetPartnerForm()
    } catch (err) {
      setPartnerError(err?.message || 'Failed to save partner society.')
    } finally {
      setPartnerSaving(false)
    }
  }

  const handleDeletePartner = async (id) => {
    try {
      await apiClient.delete(`/admin/partner-societies/${id}`)
      setPartners(prev => prev.filter(p => p._id !== id))
    } catch {
      setPartnerError('Failed to remove partner society.')
    }
    setConfirmDeletePartner(null)
  }

  // ─── COMMISSION VIEW LOG OPERATIONS ─────────────────────────
  const fetchPartnerCommissions = async (partnerId, page = 1) => {
    try {
      setCommissionsLoading(true)
      const res = await apiClient.get(`/admin/partner-societies/${partnerId}/commissions?page=${page}`)
      if (res.success) {
        setCommissions(res.commissions || [])
        setCommissionsPage(res.page)
        setCommissionsTotalPages(res.totalPages)
        setCommissionsTotal(res.total)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCommissionsLoading(false)
    }
  }

  const handleOpenCommissions = (partner) => {
    setViewingCommissionsPartner(partner)
    setCommissions([])
    setCommissionsPage(1)
    fetchPartnerCommissions(partner._id, 1)
  }

  // ─── PAYOUT REQUEST ACTIONS ────────────────────────────────
  const handleOpenPayoutModal = (payout, action) => {
    setSelectedPayout(payout)
    setPayoutAction(action)
    setAdminRemark('')
    setShowPayoutModal(true)
  }

  const handleProcessPayout = async (e) => {
    e.preventDefault()
    setProcessingPayout(true)
    setPayoutError('')
    try {
      const res = await apiClient.put(`/admin/payout-requests/${selectedPayout._id}`, {
        action: payoutAction,
        adminRemark
      })
      if (res.success) {
        // update status in list
        setPayoutRequests(prev => prev.map(p => p._id === selectedPayout._id ? res.request : p))
        setShowPayoutModal(false)
      }
    } catch (err) {
      setPayoutError(err?.message || 'Failed to process payout request.')
    } finally {
      setProcessingPayout(false)
    }
  }

  const availableSocieties = societies.filter(s => 
    !partners.some(p => (p.society?._id || p.society) === s._id)
  )

  return (
    <div style={{ position: 'relative' }}>
      {error && (
        <div className="alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Title block */}
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>
          Societies <span className="text-secondary" style={{ fontSize: 16, fontWeight: 400 }}>({societies.length})</span>
        </h1>
        <div className="flex gap-8">
          {activeTab === 'societies' && (
            <>
              <button 
                disabled={exporting}
                className="btn btn-glass btn-sm text-success" 
                onClick={handleExport}
                style={{ borderColor: 'rgba(50,215,75,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={16} /> {exporting ? 'Exporting...' : 'Export Excel'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true) }}>
                <Plus size={16} /> Add Society
              </button>
            </>
          )}
          {activeTab === 'partners' && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddPartner}>
              <Plus size={16} /> Add Partner Society
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-16" style={{ borderBottom: '1px solid var(--divider)', marginBottom: 20, paddingBottom: 0 }}>
        <button 
          onClick={() => { setActiveTab('societies'); setSearch(''); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 15, 
            fontWeight: activeTab === 'societies' ? 700 : 500, 
            color: activeTab === 'societies' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            cursor: 'pointer',
            paddingBottom: 10,
            borderBottom: activeTab === 'societies' ? '2.5px solid var(--accent-lime)' : '2.5px solid transparent',
            outline: 'none'
          }}
        >
          All Societies
        </button>
        <button 
          onClick={() => { setActiveTab('partners'); setSearch(''); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 15, 
            fontWeight: activeTab === 'partners' ? 700 : 500, 
            color: activeTab === 'partners' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            cursor: 'pointer',
            paddingBottom: 10,
            borderBottom: activeTab === 'partners' ? '2.5px solid var(--accent-lime)' : '2.5px solid transparent',
            outline: 'none'
          }}
        >
          Partner Societies
        </button>
        <button 
          onClick={() => { setActiveTab('payouts'); setSearch(''); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 15, 
            fontWeight: activeTab === 'payouts' ? 700 : 500, 
            color: activeTab === 'payouts' ? 'var(--text-primary)' : 'var(--text-secondary)', 
            cursor: 'pointer',
            paddingBottom: 10,
            borderBottom: activeTab === 'payouts' ? '2.5px solid var(--accent-lime)' : '2.5px solid transparent',
            outline: 'none'
          }}
        >
          Payout Requests
        </button>
      </div>

      {/* Tab: All Societies */}
      {activeTab === 'societies' && (
        <>
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

          {loading ? (
            <div className="skeleton-container" style={{ height: 200 }} />
          ) : (
            <div className="glass overflow-visible">
              <table className="data-table">
                <thead>
                  <tr><th>Society Name</th><th>Area / City</th><th>Pincode</th><th>Capacity</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredSocieties.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-24 text-secondary">No societies found.</td></tr>
                  ) : filteredSocieties.map(s => (
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
                        <div className="flex flex-col gap-4">
                          <span style={{ fontSize: 13 }}>{s.slots?.length || 0} Slots</span>
                          {(s.towers || []).length > 0 && (
                            <span className="text-secondary" style={{ fontSize: 11 }}>{(s.towers || []).length} Towers</span>
                          )}
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
          )}
        </>
      )}

      {/* Tab: Partner Societies */}
      {activeTab === 'partners' && (
        <>
          <div className="flex gap-12" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="input-field" placeholder="Search by partner name, society, email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
            </div>
          </div>

          {partnerError && (
            <div className="alert-error" style={{ marginBottom: 16 }}>
              {partnerError}
            </div>
          )}

          {partnersLoading ? (
            <div className="skeleton-container" style={{ height: 200 }} />
          ) : (
            <div className="glass overflow-visible">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Society / Contact</th>
                    <th>Email / Phone</th>
                    <th>Comm. Rate</th>
                    <th>Balance Details</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-24 text-secondary">No partner societies found.</td></tr>
                  ) : filteredPartners.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div className="flex flex-col">
                          <span style={{ fontWeight: 600 }}>{p.society?.name || 'Deleted Society'}</span>
                          <span className="text-secondary" style={{ fontSize: 11 }}>{p.contactName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span style={{ fontSize: 13 }}>{p.email}</span>
                          <span className="text-secondary" style={{ fontSize: 11 }}>{p.phone || 'No phone'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.commissionRate}%</span>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-lime)' }}>
                            ₹{(p.pendingBalance || 0).toFixed(2)} pending
                          </span>
                          <span className="text-secondary" style={{ fontSize: 11 }}>
                            ₹{(p.totalEarned || 0).toFixed(2)} total
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${p.isActive ? 'chip-success' : 'chip-error'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-8">
                          <button 
                            className="btn-icon btn-glass text-secondary" 
                            title="View Commissions"
                            onClick={() => handleOpenCommissions(p)}
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            className="btn-icon btn-glass text-secondary" 
                            title="Edit Partner"
                            onClick={() => handleOpenEditPartner(p)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="btn-icon btn-glass text-error" 
                            title="Remove Partner"
                            onClick={() => setConfirmDeletePartner(p)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab: Payout Requests */}
      {activeTab === 'payouts' && (
        <>
          <div className="flex gap-12" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="input-field" placeholder="Search by society or contact person..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
            </div>
          </div>

          {payoutError && (
            <div className="alert-error" style={{ marginBottom: 16 }}>
              {payoutError}
            </div>
          )}

          {payoutsLoading ? (
            <div className="skeleton-container" style={{ height: 200 }} />
          ) : (
            <div className="glass overflow-visible">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Society / Contact</th>
                    <th>Bank Details</th>
                    <th>Requested Amt</th>
                    <th>Requested On</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-24 text-secondary">No payout requests found.</td></tr>
                  ) : filteredPayouts.map(pr => (
                    <tr key={pr._id}>
                      <td>
                        <div className="flex flex-col">
                          <span style={{ fontWeight: 600 }}>{pr.partnerSociety?.society?.name || 'Deleted Society'}</span>
                          <span className="text-secondary" style={{ fontSize: 11 }}>{pr.partnerSociety?.contactName || 'Deleted Partner'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, lineHeight: '1.4' }}>
                          {pr.bankDetails?.upiId ? (
                            <div><strong>UPI:</strong> {pr.bankDetails.upiId}</div>
                          ) : (
                            <div>
                              <div><strong>Acc:</strong> {pr.bankDetails?.accountNumber}</div>
                              <div><strong>IFSC:</strong> {pr.bankDetails?.ifscCode} ({pr.bankDetails?.bankName})</div>
                              <div><strong>Name:</strong> {pr.bankDetails?.accountName}</div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>₹{(pr.amount || 0).toFixed(2)}</span>
                      </td>
                      <td>
                        <span className="text-secondary" style={{ fontSize: 13 }}>
                          {pr.createdAt ? new Date(pr.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-4">
                          <span className={`chip ${pr.status === 'approved' ? 'chip-success' : pr.status === 'pending' ? 'chip-warning' : 'chip-error'}`}>
                            {pr.status.toUpperCase()}
                          </span>
                          {pr.adminRemark && (
                            <span className="text-secondary" style={{ fontSize: 10, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pr.adminRemark}>
                              Note: {pr.adminRemark}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-8">
                          {pr.status === 'pending' ? (
                            <>
                              <button 
                                className="btn btn-glass btn-xs text-success" 
                                style={{ padding: '4px 8px', fontSize: 11, borderColor: 'rgba(50,215,75,0.3)' }}
                                onClick={() => handleOpenPayoutModal(pr, 'approve')}
                              >
                                <Check size={12} style={{ marginRight: 4 }} /> Approve
                              </button>
                              <button 
                                className="btn btn-glass btn-xs text-error" 
                                style={{ padding: '4px 8px', fontSize: 11, borderColor: 'rgba(255,59,48,0.3)' }}
                                onClick={() => handleOpenPayoutModal(pr, 'reject')}
                              >
                                <Ban size={12} style={{ marginRight: 4 }} /> Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                              Processed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Context Menu All Societies */}
      {openMenu && (
        <div ref={menuRef} className="glass animate-fade-in" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 1000, minWidth: 160, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)' }}>
          <button onClick={() => handleEdit(societies.find(s => s._id === openMenu))} className="menu-item"><Edit2 size={14} /> Edit Society</button>
          <div className="divider" />
          <button onClick={() => { setConfirmDelete(societies.find(s => s._id === openMenu)); setOpenMenu(null) }} className="menu-item text-error"><Trash2 size={14} /> Delete</button>
        </div>
      )}

      {/* Modal: Add/Edit Society */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-solid modal-content-lg animate-scale-in" style={{ width: 600, padding: 40, maxHeight: '90vh', overflowY: 'auto' }}>
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

                {/* Towers and Blocks Section */}
                <div className="flex flex-col gap-8 span-2" style={{ borderTop: '1px solid var(--divider)', paddingTop: 16, marginTop: 8 }}>
                   <div className="flex justify-between items-center">
                      <label className="text-label-xs" style={{ letterSpacing: '0.05em' }}>TOWERS & BLOCKS</label>
                      <button type="button" className="btn btn-glass btn-sm" onClick={handleAddTower} style={{ padding: '4px 8px', fontSize: 11 }}>
                         <Plus size={12} style={{ marginRight: 4 }} /> Add Tower
                      </button>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                      {(formData.towers || []).map((tower, idx) => (
                         <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <input required className="input-field" style={{ flex: 1.2 }} value={tower.name} onChange={e => handleTowerNameChange(idx, e.target.value)} placeholder="Tower (e.g. Tower A)" />
                            <input className="input-field" style={{ flex: 2 }} value={tower.blocks ? tower.blocks.join(', ') : ''} onChange={e => handleTowerBlocksChange(idx, e.target.value)} placeholder="Blocks (e.g. B1, B2 - comma separated)" />
                            <button type="button" className="btn-icon btn-glass text-error" onClick={() => handleRemoveTower(idx)}>
                               <X size={14} />
                            </button>
                         </div>
                      ))}
                      {(formData.towers || []).length === 0 && (
                         <span className="text-secondary" style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4 }}>No towers configured yet.</span>
                      )}
                   </div>
                </div>

                <div className="span-2 pt-16 flex justify-end gap-12" style={{ borderTop: '1px solid var(--divider)', marginTop: 16 }}>
                   <button type="button" className="btn btn-glass" onClick={() => setShowModal(false)}>Cancel</button>
                   <button disabled={saving} type="submit" className="btn btn-primary">{saving ? 'Saving...' : 'Save Society'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Partner Society */}
      {showPartnerModal && (
        <div className="modal-overlay">
          <div className="glass-solid modal-content-lg animate-scale-in" style={{ width: 550, padding: 40 }}>
             <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <h2 className="text-display-sm">{editingPartner ? 'Edit Partner Society' : 'Add Partner Society'}</h2>
                <button className="btn-icon btn-glass" onClick={() => setShowPartnerModal(false)}><X size={20} /></button>
             </div>

             {partnerError && (
                <div className="alert-error" style={{ marginBottom: 16 }}>
                   {partnerError}
                </div>
             )}

             <form onSubmit={handleSavePartner} className="grid-2 gap-16">
                {!editingPartner ? (
                   <div className="flex flex-col gap-6 span-2">
                      <label className="text-label-xs">SELECT SOCIETY *</label>
                      <select 
                         required 
                         className="input-field" 
                         value={partnerFormData.societyId} 
                         onChange={e => setPartnerFormData({...partnerFormData, societyId: e.target.value})}
                      >
                         <option value="">-- Choose Society --</option>
                         {availableSocieties.map(s => (
                            <option key={s._id} value={s._id}>{s.name} ({s.city}, {s.area})</option>
                         ))}
                      </select>
                   </div>
                ) : (
                   <div className="flex flex-col gap-6 span-2">
                      <label className="text-label-xs">SOCIETY</label>
                      <input disabled className="input-field" style={{ opacity: 0.7 }} value={editingPartner.society?.name || ''} />
                   </div>
                )}

                <div className="flex flex-col gap-6 span-2">
                   <label className="text-label-xs">CONTACT PERSON NAME *</label>
                   <input required className="input-field" value={partnerFormData.contactName} onChange={e => setPartnerFormData({...partnerFormData, contactName: e.target.value})} placeholder="e.g. John Doe" />
                </div>

                <div className="flex flex-col gap-6 span-2">
                   <label className="text-label-xs">EMAIL *</label>
                   <input 
                      required 
                      disabled={!!editingPartner} 
                      className="input-field" 
                      style={editingPartner ? { opacity: 0.7 } : {}}
                      type="email" 
                      value={partnerFormData.email} 
                      onChange={e => setPartnerFormData({...partnerFormData, email: e.target.value})} 
                      placeholder="e.g. partner@society.com" 
                   />
                </div>

                <div className="flex flex-col gap-6 span-2">
                   <label className="text-label-xs">PASSWORD {editingPartner ? '(Optional reset)' : '*'}</label>
                   <input 
                      required={!editingPartner} 
                      className="input-field" 
                      type="password" 
                      value={partnerFormData.password} 
                      onChange={e => setPartnerFormData({...partnerFormData, password: e.target.value})} 
                      placeholder={editingPartner ? "Leave blank to keep current" : "Min 8 characters"} 
                      minLength={8}
                   />
                </div>

                <div className="flex flex-col gap-6">
                   <label className="text-label-xs">PHONE NUMBER</label>
                   <input className="input-field" value={partnerFormData.phone} onChange={e => setPartnerFormData({...partnerFormData, phone: e.target.value})} placeholder="10-digit mobile" />
                </div>

                <div className="flex flex-col gap-6">
                   <label className="text-label-xs">COMMISSION RATE (%) *</label>
                   <input required type="number" min="0" max="100" className="input-field" value={partnerFormData.commissionRate} onChange={e => setPartnerFormData({...partnerFormData, commissionRate: e.target.value})} placeholder="Percentage (e.g. 5)" />
                </div>

                {editingPartner && (
                   <div className="flex items-center gap-10 span-2 pt-8">
                      <input 
                         type="checkbox" 
                         id="partnerIsActive" 
                         checked={partnerFormData.isActive} 
                         onChange={e => setPartnerFormData({...partnerFormData, isActive: e.target.checked})} 
                      />
                      <label htmlFor="partnerIsActive" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Account Active</label>
                   </div>
                )}

                <div className="span-2 pt-16 flex justify-end gap-12">
                   <button type="button" className="btn btn-glass" onClick={() => setShowPartnerModal(false)}>Cancel</button>
                   <button disabled={partnerSaving} type="submit" className="btn btn-primary">{partnerSaving ? 'Saving...' : 'Save Partner'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal: View Commissions Log */}
      {viewingCommissionsPartner && (
        <div className="modal-overlay">
          <div className="glass-solid modal-content-lg animate-scale-in" style={{ width: 700, padding: 40 }}>
             <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
                <div>
                   <h2 className="text-display-sm">Commissions History</h2>
                   <p className="text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
                      For partner: <strong>{viewingCommissionsPartner.society?.name}</strong> ({viewingCommissionsPartner.contactName})
                   </p>
                </div>
                <button className="btn-icon btn-glass" onClick={() => setViewingCommissionsPartner(null)}><X size={20} /></button>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="glass" style={{ padding: '12px 16px', borderRadius: 12 }}>
                   <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)' }}>TOTAL EARNED</span>
                   <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-lime)', marginTop: 4 }}>₹{(viewingCommissionsPartner.totalEarned || 0).toFixed(2)}</div>
                </div>
                <div className="glass" style={{ padding: '12px 16px', borderRadius: 12 }}>
                   <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)' }}>PENDING BALANCE</span>
                   <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>₹{(viewingCommissionsPartner.pendingBalance || 0).toFixed(2)}</div>
                </div>
             </div>

             <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20 }} className="glass">
                <table className="data-table">
                   <thead>
                      <tr>
                         <th>Customer</th>
                         <th>Subscription</th>
                         <th>Comm. Amt</th>
                         <th>Date</th>
                         <th>Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {commissionsLoading ? (
                         <tr><td colSpan="5" className="text-center py-24 text-secondary">Loading...</td></tr>
                      ) : commissions.length === 0 ? (
                         <tr><td colSpan="5" className="text-center py-24 text-secondary">No commission records yet.</td></tr>
                      ) : commissions.map(c => (
                         <tr key={c._id}>
                            <td>
                               <div style={{ fontSize: 13, fontWeight: 500 }}>
                                  {c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : 'Unknown Customer'}
                               </div>
                               <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                  {c.customer?.phone}
                               </div>
                            </td>
                            <td>
                               <div style={{ fontSize: 12 }}>₹{c.subscriptionAmount}</div>
                               <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Rate: {c.commissionRate}%</div>
                            </td>
                            <td>
                               <strong style={{ color: 'var(--accent-lime)' }}>₹{(c.commissionAmount || 0).toFixed(2)}</strong>
                            </td>
                            <td className="text-secondary" style={{ fontSize: 12 }}>
                               {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                               <span className={`chip ${c.status === 'paid' ? 'chip-success' : 'chip-warning'}`}>
                                  {c.status}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {commissionsTotalPages > 1 && (
                <div className="flex justify-between items-center">
                   <button 
                      disabled={commissionsPage <= 1 || commissionsLoading} 
                      className="btn btn-glass btn-xs"
                      onClick={() => fetchPartnerCommissions(viewingCommissionsPartner._id, commissionsPage - 1)}
                   >
                      Prev
                   </button>
                   <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Page {commissionsPage} of {commissionsTotalPages}
                   </span>
                   <button 
                      disabled={commissionsPage >= commissionsTotalPages || commissionsLoading} 
                      className="btn btn-glass btn-xs"
                      onClick={() => fetchPartnerCommissions(viewingCommissionsPartner._id, commissionsPage + 1)}
                   >
                      Next
                   </button>
                </div>
             )}
          </div>
        </div>
      )}

      {/* Modal: Process Payout Request */}
      {showPayoutModal && selectedPayout && (
        <div className="modal-overlay">
          <div className="glass-solid animate-scale-in" style={{ width: 450, padding: 32, borderRadius: 24 }}>
             <h3 className="text-display-xs" style={{ marginBottom: 12 }}>
                {payoutAction === 'approve' ? 'Approve Payout Request?' : 'Reject Payout Request?'}
             </h3>
             <p className="text-secondary" style={{ marginBottom: 20, fontSize: 14 }}>
                You are about to <strong>{payoutAction}</strong> the payout of <strong>₹{(selectedPayout.amount || 0).toFixed(2)}</strong> for <strong>{selectedPayout.partnerSociety?.society?.name}</strong>.
             </p>

             {payoutError && (
                <div className="alert-error" style={{ marginBottom: 16 }}>
                   {payoutError}
                </div>
             )}

             <form onSubmit={handleProcessPayout}>
                <div className="flex flex-col gap-6 style={{ marginBottom: 20 }}">
                   <label className="text-label-xs">ADMIN REMARK / TRANSACTION ID</label>
                   <textarea 
                      className="input-field" 
                      style={{ minHeight: 80, padding: 12 }} 
                      value={adminRemark} 
                      onChange={e => setAdminRemark(e.target.value)} 
                      placeholder={payoutAction === 'approve' ? "Txn Ref No. / Approval Note..." : "Reason for rejection..."} 
                      required={payoutAction === 'reject'}
                   />
                </div>

                <div className="flex gap-12" style={{ marginTop: 24 }}>
                   <button type="button" className="btn btn-glass w-full" onClick={() => setShowPayoutModal(false)}>Cancel</button>
                   <button 
                      type="submit" 
                      className="btn w-full" 
                      style={{ 
                         background: payoutAction === 'approve' ? 'var(--accent-lime)' : 'var(--error)', 
                         color: '#fff',
                         borderRadius: 12
                      }}
                      disabled={processingPayout}
                   >
                      {processingPayout ? 'Processing...' : payoutAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete All Societies */}
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

      {/* Modal: Confirm Remove Partner Society */}
      {confirmDeletePartner && (
        <div className="modal-overlay">
          <div className="glass animate-scale-in" style={{ width: 400, padding: 32, textAlign: 'center' }}>
            <div className="icon-circle-lg bg-error-light" style={{ margin: '0 auto 20px' }}><Trash2 size={24} color="var(--error)" /></div>
            <h3 className="text-display-xs">Remove Partner?</h3>
            <p className="text-secondary" style={{ margin: '8px 0 24px' }}>Are you sure you want to remove <strong>{confirmDeletePartner.contactName}</strong> as a partner for <strong>{confirmDeletePartner.society?.name}</strong>? They will no longer be able to log in.</p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmDeletePartner(null)}>Cancel</button>
              <button className="btn btn-error w-full" onClick={() => handleDeletePartner(confirmDeletePartner._id)}>Remove Partner</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

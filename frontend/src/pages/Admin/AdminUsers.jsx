import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Filter, MoreVertical, Plus, X, Trash2, UserX, UserCheck, ChevronDown, Eye } from 'lucide-react'
import apiClient from '../../services/apiClient'

const STATUSES = ['all', 'active', 'inactive']
const PLANS = ['all', 'None', 'Basic', 'Standard', 'Premium', 'Elite']

export default function AdminUsers() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [openMenu, setOpenMenu] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const menuRef = useRef(null)

  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', email: '', city: '' })

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/admin/users')
      setUsers(res.users || [])
    } catch (err) {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = users.filter(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase()
    const matchesSearch = fullName.includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && u.isActive !== false) ||
      (filterStatus === 'inactive' && u.isActive === false)
    const matchesPlan = filterPlan === 'all' ||
      (filterPlan === 'None' && !u.activePlan) ||
      (u.activePlan && u.activePlan.toLowerCase().includes(filterPlan.toLowerCase()))
    return matchesSearch && matchesStatus && matchesPlan
  })

  const handleToggleActive = async (user) => {
    try {
      await apiClient.put(`/admin/users/${user._id}`, { isActive: !user.isActive })
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u))
    } catch {
      setError('Failed to update user status. Please try again.')
    }
    setOpenMenu(null)
  }

  const handleDelete = async (userId) => {
    try {
      await apiClient.delete(`/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u._id !== userId))
    } catch {
      setError('Failed to deactivate user. Please try again.')
    }
    setConfirmDelete(null)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await apiClient.post('/admin/users', formData)
      setUsers(prev => [res.user, ...prev])
      setShowAddModal(false)
      setFormData({ firstName: '', lastName: '', phone: '', email: '', city: '' })
    } catch (err) {
      setError(err?.message || 'Failed to add user. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const activeFiltersCount = (filterStatus !== 'all' ? 1 : 0) + (filterPlan !== 'all' ? 1 : 0)

  if (loading) return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 32, width: 140, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 36, width: 110, borderRadius: 8 }} />
      </div>
      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div className="skeleton" style={{ height: 44, flex: 1, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 44, width: 80, borderRadius: 12 }} />
      </div>
      <div className="glass" style={{ overflow: 'hidden', borderRadius: 16 }}>
        {[0,1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 52, margin: '8px 16px', borderRadius: 8 }} />)}
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
          Users <span className="text-secondary" style={{ fontSize: 16, fontWeight: 400 }}>({users.length})</span>
        </h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="flex gap-12" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input className="input-field" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
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

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass animate-fade-in" style={{ padding: '16px 20px', marginBottom: 16, borderRadius: 16, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
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
          <div className="flex flex-col gap-6">
            <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', fontWeight: 600 }}>PLAN</label>
            <div className="flex gap-8 flex-wrap">
              {PLANS.map(p => (
                <button key={p} onClick={() => setFilterPlan(p)}
                  className={`chip ${filterPlan === p ? 'chip-lime' : 'chip-ghost'}`}
                  style={{ cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setFilterStatus('all'); setFilterPlan('all') }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="glass" style={{ overflow: 'visible', borderRadius: 16 }}>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Vehicles</th><th>Plan</th><th>Status</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-4 text-secondary">No users found.</td></tr>
            ) : filtered.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 500 }}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'}</td>
                <td className="text-secondary">{u.phone || u.email || 'N/A'}</td>
                <td>{u.vehiclesCount || 0}</td>
                <td><span className={`chip ${u.activePlan ? 'chip-lime' : 'chip-ghost'}`}>{u.activePlan || 'None'}</span></td>
                <td>
                  <span className={`chip ${u.isActive !== false ? 'chip-success' : 'chip-error'}`}>
                    {u.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-secondary">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ position: 'relative' }} ref={openMenu === u._id ? menuRef : null}>
                  <button
                    style={{ color: 'var(--text-tertiary)', padding: 4 }}
                    onClick={() => setOpenMenu(openMenu === u._id ? null : u._id)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenu === u._id && (
                    <div className="glass animate-fade-in" style={{
                      position: 'absolute', right: 8, top: '100%', zIndex: 100,
                      minWidth: 180, borderRadius: 14, overflow: 'hidden',
                      border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)'
                    }}>
                      <Link
                        to={`/admin/users/${u._id}`}
                        className="flex items-center gap-10"
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
                      >
                        <Eye size={15} /> View Details
                      </Link>
                      <div style={{ height: 1, background: 'var(--divider)' }} />
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="flex items-center gap-10"
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: u.isActive !== false ? 'var(--warning)' : 'var(--success)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        {u.isActive !== false ? <UserX size={15} /> : <UserCheck size={15} />}
                        {u.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <div style={{ height: 1, background: 'var(--divider)' }} />
                      <button
                        onClick={() => { setConfirmDelete(u); setOpenMenu(null) }}
                        className="flex items-center gap-10"
                        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', fontSize: 14, color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} /> Delete User
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 520, padding: '48px 56px', borderRadius: 36,
            border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 200, height: 200, background: 'var(--primary-blue)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div className="flex justify-between items-start" style={{ marginBottom: 36 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Add User</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Create a new customer account</p>
              </div>
              <button className="glass flex items-center justify-center" onClick={() => setShowAddModal(false)}
                style={{ width: 40, height: 40, borderRadius: 14 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-20">
              <div className="grid-2 gap-16">
                <div className="flex flex-col gap-8">
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>FIRST NAME *</label>
                  <input required className="input-field" placeholder="John" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div className="flex flex-col gap-8">
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>LAST NAME</label>
                  <input className="input-field" placeholder="Doe" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>PHONE *</label>
                <input required className="input-field" placeholder="9876543210" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>EMAIL</label>
                <input type="email" className="input-field" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>CITY</label>
                <input className="input-field" placeholder="Mumbai" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <button disabled={saving} className="btn btn-primary w-full" type="submit"
                style={{ padding: '16px', borderRadius: 20, fontSize: 16, fontWeight: 700, marginTop: 8 }}>
                {saving ? 'Creating...' : 'Create User'}
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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Delete User?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 28 }}>
              This will permanently delete <strong>{`${confirmDelete.firstName || ''} ${confirmDelete.lastName || ''}`.trim() || 'this user'}</strong> and cannot be undone.
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

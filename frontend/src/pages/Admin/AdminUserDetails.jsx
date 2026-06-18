import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Car, Box, ShoppingBag, Plus, X, Loader2, Ban } from 'lucide-react'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'
import { useToast } from '../../context/ToastContext'

const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }

export default function AdminUserDetails() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Reference data for the forms
  const [packages, setPackages] = useState([])
  const [societies, setSocieties] = useState([])
  const [cleaners, setCleaners] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])

  // Modal + form state
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmCancelId, setConfirmCancelId] = useState(null)

  const emptyVehicle = { brand: '', model: '', number: '', category: '', color: '', blockTower: '', slotPillar: '', flatNumber: '' }
  const emptySub = { vehicleId: '', packageId: '', societyId: '', slotId: '', startDate: '', durationDays: 30, amount: '', assignedCleanerId: '' }
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [subForm, setSubForm] = useState(emptySub)

  const fetchDetails = async () => {
    try {
      const res = await apiClient.get(`/admin/users/${id}`)
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to fetch user details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
    // Load form reference data (best-effort)
    apiClient.get('/admin/packages').then(r => setPackages(r.packages || [])).catch(() => {})
    apiClient.get('/admin/societies').then(r => setSocieties(r.societies || [])).catch(() => {})
    apiClient.get('/admin/cleaners', { limit: 'all' }).then(r => setCleaners(r.cleaners || [])).catch(() => {})
    apiClient.get('/admin/brands').then(r => setBrands(r.brands || [])).catch(() => {})
    apiClient.get('/admin/vehicle-categories').then(r => setCategories(r.categories || [])).catch(() => {})
  }, [id])

  const handleAddVehicle = async (e) => {
    e.preventDefault()
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.number) {
      showToast('Brand, model, and number are required', 'error')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(vehicleForm).forEach(([k, v]) => fd.append(k, v))
      await apiClient.uploadForm(`/admin/users/${id}/vehicles`, fd)
      showToast('Vehicle added successfully', 'success')
      setShowVehicleModal(false)
      setVehicleForm(emptyVehicle)
      fetchDetails()
    } catch (err) {
      showToast(err.message || 'Failed to add vehicle', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddSubscription = async (e) => {
    e.preventDefault()
    if (!subForm.vehicleId || !subForm.packageId || !subForm.societyId || !subForm.slotId) {
      showToast('Vehicle, package, society, and slot are required', 'error')
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post(`/admin/users/${id}/subscriptions`, {
        ...subForm,
        durationDays: Number(subForm.durationDays) || 30,
        amount: subForm.amount === '' ? undefined : Number(subForm.amount),
        assignedCleanerId: subForm.assignedCleanerId || undefined,
      })
      showToast('Subscription created successfully', 'success')
      setShowSubModal(false)
      setSubForm(emptySub)
      fetchDetails()
    } catch (err) {
      showToast(err.message || 'Failed to create subscription', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelSubscription = async (subId) => {
    setSubmitting(true)
    try {
      await apiClient.put(`/admin/subscriptions/${subId}/cancel`)
      showToast('Subscription deactivated', 'success')
      setConfirmCancelId(null)
      fetchDetails()
    } catch (err) {
      showToast(err.message || 'Failed to deactivate subscription', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />
  if (error) return <div className="p-4 text-error">{error}</div>
  if (!data?.user) return <div className="p-4">User not found</div>

  const { user, vehicles, subscriptions, orders } = data
  const selectedSociety = societies.find(s => s._id === subForm.societyId)
  const selectedPackage = packages.find(p => p._id === subForm.packageId)

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="flex items-center gap-12" style={{ marginBottom: 24 }}>
        <Link to="/admin/users" className="btn-icon btn-glass">
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>
          User Details
        </h1>
      </div>

      <div className="grid-2 gap-24">
        {/* Profile Card */}
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <div className="flex items-center gap-16" style={{ marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#0A0A0A' }}>
              {user.firstName ? user.firstName.trim().charAt(0).toUpperCase() : (user.name ? user.name.trim().charAt(0).toUpperCase() : <User size={32} />)}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user.firstName || user.name || 'User'} {user.lastName || ''}</h2>
              <span className={`chip mt-4 ${user.isActive !== false ? 'chip-success' : 'chip-error'}`}>
                {user.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-12">
            <div className="flex items-center gap-12 text-secondary">
              <Phone size={16} /> <span>{user.phone}</span>
            </div>
            {user.email && (
              <div className="flex items-center gap-12 text-secondary">
                <Mail size={16} /> <span>{user.email}</span>
              </div>
            )}
            {user.city && (
              <div className="flex items-center gap-12 text-secondary">
                <MapPin size={16} /> <span>{user.city}</span>
              </div>
            )}
            <div className="flex items-center gap-12 text-secondary">
              <Calendar size={16} /> <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} className="text-secondary" /> Saved Addresses
          </h3>
          {user.addresses?.length > 0 ? (
            <div className="flex flex-col gap-12">
              {user.addresses.map(a => (
                <div key={a._id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontWeight: 600 }}>{a.label} {a.isDefault && <span className="chip chip-lime ml-8">Default</span>}</div>
                  <div className="text-secondary text-sm mt-4">{a.line1}, {a.line2}</div>
                  <div className="text-secondary text-sm">{a.city} - {a.pincode}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-secondary text-sm">No saved addresses.</div>
          )}
        </div>
      </div>

      {/* Vehicles */}
      <div className="flex justify-between items-center" style={{ marginTop: 32, marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Car size={24} className="text-primary-blue" /> Vehicles ({vehicles?.length || 0})
        </h3>
        <button className="btn btn-primary btn-sm flex items-center gap-8" onClick={() => setShowVehicleModal(true)}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>
      {vehicles?.length > 0 ? (
        <div className="grid-3 gap-16">
          {vehicles.map(v => (
            <div key={v._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{v.brand} {v.model}</div>
                  <div className="chip chip-ghost mt-4">{v.number}</div>
                </div>
                <div className="chip chip-lime" style={{ textTransform: 'capitalize' }}>{(v.category || 'vehicle').replace('_', ' ')}</div>
              </div>
              <div className="text-sm text-secondary mb-12">
                Color: {v.color || 'N/A'} <br/>
                Parking: {v.parking || 'N/A'}
              </div>
              {v.photos && v.photos.length > 0 && (
                <div className="flex gap-8 overflow-x-auto" style={{ paddingBottom: 8 }}>
                  {v.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="Vehicle" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)' }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No vehicles added.</div>
      )}

      {/* Subscriptions */}
      <div className="flex justify-between items-center" style={{ marginTop: 32, marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Box size={24} className="text-accent-lime" /> Subscriptions ({subscriptions?.length || 0})
        </h3>
        <button
          className="btn btn-primary btn-sm flex items-center gap-8"
          onClick={() => {
            setSubForm({ ...emptySub, vehicleId: vehicles?.[0]?._id || '' })
            setShowSubModal(true)
          }}
          disabled={!vehicles?.length}
          title={!vehicles?.length ? 'Add a vehicle first' : ''}
        >
          <Plus size={16} /> Add Subscription
        </button>
      </div>
      {subscriptions?.length > 0 ? (
        <div className="grid-2 gap-16">
          {subscriptions.map(s => (
            <div key={s._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-center mb-8">
                <div style={{ fontWeight: 600 }}>{s.package?.name || 'Trial Package'}</div>
                <div className={`chip ${s.status === 'Active' ? 'chip-success' : s.status === 'Cancelled' ? 'chip-error' : 'chip-ghost'}`}>{s.status}</div>
              </div>
              <div className="text-sm text-secondary flex flex-col gap-4">
                <div>Vehicle: {s.vehicle?.brand || s.vehicle?.model ? `${s.vehicle.brand || ''} ${s.vehicle.model || ''}`.trim() : 'N/A'} ({s.vehicle?.number || 'N/A'})</div>
                <div>Expires: {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'N/A'}</div>
                <div>Amount: ₹{s.amount ?? 'N/A'}</div>
              </div>
              {s.status === 'Active' && (
                <button
                  className="btn btn-ghost btn-sm flex items-center gap-8"
                  style={{ color: 'var(--error)', marginTop: 12 }}
                  onClick={() => setConfirmCancelId(s._id)}
                >
                  <Ban size={14} /> Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No active subscriptions.</div>
      )}

      {/* Marketplace Orders */}
      <h3 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShoppingBag size={24} className="text-primary-blue" /> Marketplace Orders ({orders?.length || 0})
      </h3>
      {orders?.length > 0 ? (
        <div className="grid-2 gap-16">
          {orders.map(o => (
            <div key={o._id} className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <div className="flex justify-between items-center mb-8">
                <div style={{ fontWeight: 600 }}>Order #{o.orderId}</div>
                <div className={`chip ${o.status === 'Delivered' ? 'chip-success' : o.status === 'Cancelled' ? 'chip-error' : 'chip-warning'}`}>{o.status}</div>
              </div>
              <div className="text-sm text-secondary flex flex-col gap-4">
                <div>Date: {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</div>
                <div>Items: {(o.items || []).map(i => `${i?.product?.name || 'Unknown Product'} (x${i?.quantity || 0})`).join(', ')}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>Total: ₹{o.totalAmount}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass p-4 text-center text-secondary" style={{ borderRadius: 16 }}>No marketplace orders.</div>
      )}

      {/* ── Add Vehicle Modal ── */}
      {showVehicleModal && (
        <div style={overlayStyle} onClick={() => !submitting && setShowVehicleModal(false)}>
          <form
            onSubmit={handleAddVehicle}
            onClick={e => e.stopPropagation()}
            className="glass-solid"
            style={{ maxWidth: 460, width: '100%', borderRadius: 20, padding: 28, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button type="button" onClick={() => setShowVehicleModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Add Vehicle</h3>

            <div className="flex flex-col gap-16">
              <div className="grid-2 gap-12">
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Brand *</label>
                  <select className="input-field" value={vehicleForm.brand} onChange={e => setVehicleForm({ ...vehicleForm, brand: e.target.value })}>
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Model *</label>
                  <input className="input-field" value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="e.g. Swift" />
                </div>
              </div>
              <div className="grid-2 gap-12">
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Number Plate *</label>
                  <input className="input-field" value={vehicleForm.number} onChange={e => setVehicleForm({ ...vehicleForm, number: e.target.value.toUpperCase() })} placeholder="MH01AB1234" />
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Category</label>
                  <select className="input-field" value={vehicleForm.category} onChange={e => setVehicleForm({ ...vehicleForm, category: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c._id} value={c.slug}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Color</label>
                <input className="input-field" value={vehicleForm.color} onChange={e => setVehicleForm({ ...vehicleForm, color: e.target.value })} placeholder="e.g. White" />
              </div>
              <div className="grid-3 gap-12">
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Block/Tower</label>
                  <input className="input-field" value={vehicleForm.blockTower} onChange={e => setVehicleForm({ ...vehicleForm, blockTower: e.target.value })} />
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Slot/Pillar</label>
                  <input className="input-field" value={vehicleForm.slotPillar} onChange={e => setVehicleForm({ ...vehicleForm, slotPillar: e.target.value })} />
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Flat No.</label>
                  <input className="input-field" value={vehicleForm.flatNumber} onChange={e => setVehicleForm({ ...vehicleForm, flatNumber: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex gap-12" style={{ marginTop: 24 }}>
              <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={() => setShowVehicleModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary flex items-center justify-center gap-8" style={{ flex: 1.5 }} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Add Subscription Modal ── */}
      {showSubModal && (
        <div style={overlayStyle} onClick={() => !submitting && setShowSubModal(false)}>
          <form
            onSubmit={handleAddSubscription}
            onClick={e => e.stopPropagation()}
            className="glass-solid"
            style={{ maxWidth: 460, width: '100%', borderRadius: 20, padding: 28, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button type="button" onClick={() => setShowSubModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Add Subscription</h3>

            <div className="flex flex-col gap-16">
              <div className="flex flex-col gap-4">
                <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Vehicle *</label>
                <select className="input-field" value={subForm.vehicleId} onChange={e => setSubForm({ ...subForm, vehicleId: e.target.value })}>
                  <option value="">Select vehicle</option>
                  {(vehicles || []).map(v => <option key={v._id} value={v._id}>{v.brand} {v.model} ({v.number})</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Package *</label>
                <select
                  className="input-field"
                  value={subForm.packageId}
                  onChange={e => {
                    const pkg = packages.find(p => p._id === e.target.value)
                    setSubForm({ ...subForm, packageId: e.target.value, amount: pkg ? pkg.price : '' })
                  }}
                >
                  <option value="">Select package</option>
                  {packages.map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>)}
                </select>
              </div>

              <div className="grid-2 gap-12">
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Society *</label>
                  <select className="input-field" value={subForm.societyId} onChange={e => setSubForm({ ...subForm, societyId: e.target.value, slotId: '' })}>
                    <option value="">Select society</option>
                    {societies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Slot *</label>
                  <select className="input-field" value={subForm.slotId} onChange={e => setSubForm({ ...subForm, slotId: e.target.value })} disabled={!selectedSociety}>
                    <option value="">Select slot</option>
                    {(selectedSociety?.slots || []).map(sl => {
                      const full = sl.currentCount >= sl.maxVehicles
                      const closed = (sl.status || 'Open') !== 'Open'
                      return (
                        <option key={sl.slotId} value={sl.slotId} disabled={full || closed}>
                          {sl.timeWindow} ({sl.currentCount}/{sl.maxVehicles}){closed ? ' — closed' : full ? ' — full' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="grid-2 gap-12">
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Start Date</label>
                  <input type="date" className="input-field" value={subForm.startDate} onChange={e => setSubForm({ ...subForm, startDate: e.target.value })} />
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Duration (days)</label>
                  <input type="number" min="1" className="input-field" value={subForm.durationDays} onChange={e => setSubForm({ ...subForm, durationDays: e.target.value })} />
                </div>
              </div>

              <div className="grid-2 gap-12">
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Amount (₹)</label>
                  <input type="number" min="0" className="input-field" value={subForm.amount} onChange={e => setSubForm({ ...subForm, amount: e.target.value })} placeholder={selectedPackage ? String(selectedPackage.price) : ''} />
                </div>
                <div className="flex flex-col gap-4">
                  <label className="text-label" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Assign Cleaner</label>
                  <select className="input-field" value={subForm.assignedCleanerId} onChange={e => setSubForm({ ...subForm, assignedCleanerId: e.target.value })}>
                    <option value="">None</option>
                    {cleaners.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-12" style={{ marginTop: 24 }}>
              <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={() => setShowSubModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary flex items-center justify-center gap-8" style={{ flex: 1.5 }} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Subscription
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Deactivate Confirmation ── */}
      {confirmCancelId && (
        <div style={overlayStyle} onClick={() => !submitting && setConfirmCancelId(null)}>
          <div onClick={e => e.stopPropagation()} className="glass-solid" style={{ maxWidth: 380, width: '100%', borderRadius: 20, padding: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,85,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ban size={24} color="#ff5555" />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Deactivate Subscription?</h3>
            <p className="text-secondary text-sm" style={{ lineHeight: 1.6, marginBottom: 24 }}>
              This will cancel the subscription and free up its slot. This action cannot be undone — you'll need to create a new subscription to reactivate service.
            </p>
            <div className="flex gap-12">
              <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setConfirmCancelId(null)} disabled={submitting}>Keep Active</button>
              <button className="btn btn-primary flex items-center justify-center gap-8" style={{ flex: 1, background: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => handleCancelSubscription(confirmCancelId)} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

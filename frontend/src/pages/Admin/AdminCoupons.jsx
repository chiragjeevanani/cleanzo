import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, ToggleLeft, ToggleRight, Ticket, RefreshCw } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

const CATEGORIES = [
  { value: 'first_purchase', label: 'First Purchase' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'extension', label: 'Extension' },
]

const emptyForm = {
  code: '', description: '', discountType: 'percent', discountValue: '',
  appliesTo: 'first_purchase', societies: [], allSocieties: true,
  expiresAt: '', maxRedemptions: '', minOrderAmount: '', oncePerCustomer: true, isActive: true,
}

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export default function AdminCoupons() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [coupons, setCoupons] = useState([])
  const [societies, setSocieties] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [couponRes, socRes] = await Promise.all([
        apiClient.get('/admin/coupons'),
        apiClient.get('/admin/societies'),
      ])
      setCoupons(couponRes.coupons || [])
      setSocieties(socRes.societies || [])
    } catch (err) {
      setError('Failed to load coupons.')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm, code: genCode() })
    setError('')
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditId(c._id)
    setForm({
      code: c.code,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      appliesTo: c.appliesTo,
      societies: (c.societies || []).map(s => s._id || s),
      allSocieties: !c.societies || c.societies.length === 0,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '',
      maxRedemptions: c.maxRedemptions != null ? String(c.maxRedemptions) : '',
      minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : '',
      oncePerCustomer: c.oncePerCustomer !== false,
      isActive: c.isActive !== false,
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditId(null); setError('') }

  const toggleSociety = (id) => {
    setForm(prev => {
      const has = prev.societies.includes(id)
      return { ...prev, societies: has ? prev.societies.filter(x => x !== id) : [...prev.societies, id] }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.code.trim()) { setError('Coupon code is required'); return }
    const val = Number(form.discountValue)
    if (Number.isNaN(val) || val <= 0) { setError('Discount value must be greater than 0'); return }
    if (form.discountType === 'percent' && val > 100) { setError('Percent cannot exceed 100'); return }
    if (!form.allSocieties && form.societies.length === 0) { setError('Select at least one society, or choose All societies'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description,
        discountType: form.discountType,
        discountValue: val,
        appliesTo: form.appliesTo,
        societies: form.allSocieties ? [] : form.societies,
        expiresAt: form.expiresAt || null,
        maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
        minOrderAmount: form.minOrderAmount === '' ? 0 : Number(form.minOrderAmount),
        oncePerCustomer: form.oncePerCustomer,
        isActive: form.isActive,
      }
      if (editId) {
        await apiClient.put(`/admin/coupons/${editId}`, payload)
      } else {
        await apiClient.post('/admin/coupons', payload)
      }
      await fetchAll()
      showToast(editId ? 'Coupon updated' : 'Coupon created')
      closeModal()
    } catch (err) {
      setError(err?.message || 'Failed to save coupon')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    try {
      await apiClient.put(`/admin/coupons/${c._id}`, {
        code: c.code, description: c.description, discountType: c.discountType,
        discountValue: c.discountValue, appliesTo: c.appliesTo,
        societies: (c.societies || []).map(s => s._id || s),
        expiresAt: c.expiresAt || null, maxRedemptions: c.maxRedemptions,
        minOrderAmount: c.minOrderAmount, oncePerCustomer: c.oncePerCustomer,
        isActive: !(c.isActive !== false),
      })
      setCoupons(coupons.map(x => x._id === c._id ? { ...x, isActive: !(x.isActive !== false) } : x))
      showToast(c.isActive !== false ? 'Coupon deactivated' : 'Coupon activated')
    } catch (err) {
      showToast(err?.message || 'Failed to update coupon', 'error')
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return
    try {
      await apiClient.delete(`/admin/coupons/${c._id}`)
      setCoupons(coupons.filter(x => x._id !== c._id))
      showToast('Coupon deleted')
    } catch (err) {
      showToast(err?.message || 'Failed to delete coupon', 'error')
    }
  }

  if (loading) return <PageLoader />

  const inputStyle = { background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '14px 18px', border: '1px solid var(--divider)', fontSize: 15 }
  const selectStyle = { background: 'var(--bg-surface)', color: 'var(--text-primary)', borderRadius: 16, padding: '14px 18px', border: '1px solid var(--divider)', fontSize: 15 }

  const valueLabel = (c) => c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`

  const renderCategory = (cat) => {
    const list = coupons.filter(c => c.appliesTo === cat.value)
    return (
      <div style={{ marginBottom: 40 }} key={cat.value}>
        <div style={{ marginBottom: 20, borderBottom: '1px solid var(--divider)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{cat.label}</h2>
          <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>
            {list.length} {list.length === 1 ? 'coupon' : 'coupons'}
          </span>
        </div>

        {list.length === 0 ? (
          <div className="glass" style={{ padding: 24, textAlign: 'center', borderRadius: 20, border: '1px solid var(--divider)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="text-secondary" style={{ fontSize: 14 }}>No {cat.label.toLowerCase()} coupons yet.</div>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: 24 }}>
            {list.map(c => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date()
              return (
                <div key={c._id} className="glass animate-fade-in-up" style={{ padding: 26, borderRadius: 24, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-md)', opacity: c.isActive !== false && !expired ? 1 : 0.55 }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
                    <span className="chip chip-lime" style={{ fontSize: 16, fontWeight: 800, padding: '6px 14px', letterSpacing: '0.05em' }}>{c.code}</span>
                    <button onClick={() => toggleActive(c)} style={{ color: c.isActive !== false ? 'var(--accent-lime)' : 'var(--text-tertiary)' }}>
                      {c.isActive !== false ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>

                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{valueLabel(c)}</div>
                  {c.description && <div className="text-secondary text-body-sm" style={{ marginBottom: 12 }}>{c.description}</div>}

                  <div className="flex flex-wrap gap-6" style={{ marginBottom: 14 }}>
                    <span className="chip" style={{ fontSize: 10, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {(!c.societies || c.societies.length === 0) ? 'All societies' : `${c.societies.length} ${c.societies.length === 1 ? 'society' : 'societies'}`}
                    </span>
                    {expired && <span className="chip" style={{ fontSize: 10, background: 'rgba(255,69,58,0.1)', color: 'var(--error)' }}>Expired</span>}
                  </div>

                  <div className="flex flex-col gap-6" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18, borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
                    <div className="flex justify-between"><span>Redemptions</span><span style={{ fontWeight: 700 }}>{c.redemptionCount || 0}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}</span></div>
                    {c.minOrderAmount > 0 && <div className="flex justify-between"><span>Min order</span><span style={{ fontWeight: 700 }}>₹{c.minOrderAmount}</span></div>}
                    {c.expiresAt && <div className="flex justify-between"><span>Expires</span><span style={{ fontWeight: 700 }}>{new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                    <div className="flex justify-between"><span>Per customer</span><span style={{ fontWeight: 700 }}>{c.oncePerCustomer !== false ? 'Once' : 'Unlimited'}</span></div>
                  </div>

                  <div className="flex gap-12 w-full">
                    <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 14, fontSize: 13, border: '1px solid var(--divider)' }} onClick={() => openEdit(c)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0 16px', borderRadius: 14, border: '1px solid var(--divider)', color: 'var(--error)' }} onClick={() => remove(c)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {error && !showModal && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex justify-between items-center animate-fade-in" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Coupons</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Society-scoped codes for first purchases, renewals & extensions</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ padding: '12px 28px', borderRadius: 14 }}>
          <Plus size={18} /> New Coupon
        </button>
      </div>

      {CATEGORIES.map(renderCategory)}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{ width: '100%', maxWidth: 600, padding: '32px clamp(16px, 5vw, 48px) 48px', borderRadius: 32, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)', background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 28 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Customers apply this code on the payment review page</p>
              </div>
              <button className="glass flex items-center justify-center" onClick={closeModal} style={{ width: 44, height: 44, borderRadius: 16 }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-20">
              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>COUPON CODE</label>
                <div className="flex gap-10">
                  <input required className="input-field" style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
                    value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" />
                  <button type="button" className="btn btn-ghost" style={{ borderRadius: 14, border: '1px solid var(--divider)', padding: '0 16px' }} onClick={() => setForm({ ...form, code: genCode() })} title="Generate code">
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div className="grid-2 gap-20">
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>DISCOUNT TYPE</label>
                  <select className="input-field" style={selectStyle} value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                    <option value="percent" style={{ background: 'var(--bg-surface)' }}>Percentage (%)</option>
                    <option value="flat" style={{ background: 'var(--bg-surface)' }}>Flat amount (₹)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>{form.discountType === 'percent' ? 'PERCENT (%)' : 'AMOUNT (₹)'}</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max={form.discountType === 'percent' ? "100" : undefined}
                    className="input-field" 
                    style={inputStyle}
                    value={form.discountValue} 
                    onChange={e => {
                      let val = e.target.value;
                      if (form.discountType === 'percent') {
                        const num = Number(val);
                        if (!Number.isNaN(num) && num > 100) {
                          val = '100';
                        }
                      }
                      setForm({ ...form, discountValue: val });
                    }} 
                    placeholder={form.discountType === 'percent' ? 'e.g. 20' : 'e.g. 100'} 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>APPLIES TO</label>
                <select className="input-field" style={selectStyle} value={form.appliesTo} onChange={e => setForm({ ...form, appliesTo: e.target.value })}>
                  {CATEGORIES.map(cat => <option key={cat.value} value={cat.value} style={{ background: 'var(--bg-surface)' }}>{cat.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>DESCRIPTION (CUSTOMER-FACING)</label>
                <input className="input-field" style={inputStyle}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Welcome offer for new members" />
              </div>

              {/* Societies */}
              <div className="flex flex-col gap-10">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>ELIGIBLE SOCIETIES</label>
                <label className="flex items-center gap-10" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.allSocieties} onChange={e => setForm({ ...form, allSocieties: e.target.checked, societies: [] })}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent-lime)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>All societies</span>
                </label>
                {!form.allSocieties && (
                  <div className="glass" style={{ padding: '16px 18px', borderRadius: 16, border: '1px solid var(--divider)', maxHeight: 180, overflowY: 'auto', background: 'rgba(255,255,255,0.01)' }}>
                    {societies.length === 0 ? (
                      <div className="text-secondary text-body-sm">No societies found.</div>
                    ) : (
                      <div className="flex flex-col gap-10">
                        {societies.map(s => (
                          <label key={s._id} className="flex items-center gap-10" style={{ cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.societies.includes(s._id)} onChange={() => toggleSociety(s._id)}
                              style={{ width: 15, height: 15, accentColor: 'var(--accent-lime)' }} />
                            <span style={{ fontSize: 13 }}>{s.name} <span className="text-tertiary">· {s.city}</span></span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid-2 gap-20">
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>EXPIRY DATE (OPTIONAL)</label>
                  <input type="date" className="input-field" style={inputStyle}
                    value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>MIN ORDER (₹, OPTIONAL)</label>
                  <input type="number" min="0" className="input-field" style={inputStyle}
                    value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="e.g. 299" />
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>TOTAL REDEMPTION CAP (OPTIONAL)</label>
                <input type="number" min="1" className="input-field" style={inputStyle}
                  value={form.maxRedemptions} onChange={e => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Leave blank for unlimited" />
              </div>

              <div className="flex items-center gap-24">
                <label className="flex items-center gap-10" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.oncePerCustomer} onChange={e => setForm({ ...form, oncePerCustomer: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent-lime)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>One use per customer</span>
                </label>
                <label className="flex items-center gap-10" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent-lime)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
                </label>
              </div>

              <button disabled={saving} className="btn btn-primary w-full" type="submit" style={{ padding: 18, borderRadius: 18, fontSize: 17, fontWeight: 800 }}>
                {saving ? 'Saving…' : (editId ? 'Save Changes' : 'Create Coupon')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

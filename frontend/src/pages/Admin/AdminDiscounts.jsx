import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, ToggleLeft, ToggleRight, Percent, Tag } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminDiscounts() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [global, setGlobal] = useState({ percent: 0, note: '', isActive: false })
  const [individual, setIndividual] = useState([])
  const [packages, setPackages] = useState([])
  const [brands, setBrands] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ packageId: '', brand: '', model: '', percent: '', note: '', isActive: true })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [discountRes, pkgRes, brandRes] = await Promise.all([
        apiClient.get('/admin/discounts'),
        apiClient.get('/admin/packages'),
        apiClient.get('/admin/brands'),
      ])
      setGlobal(discountRes.global || { percent: 0, note: '', isActive: false })
      setIndividual(discountRes.individual || [])
      setPackages(pkgRes.packages || [])
      setBrands(brandRes.brands || [])
    } catch (err) {
      setError('Failed to load discounts.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Global discount ───────────────────────────
  const saveGlobal = async () => {
    const pct = Number(global.percent)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) { setError('Global percent must be between 0 and 100'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiClient.put('/admin/discounts/global', { percent: pct, note: global.note, isActive: global.isActive })
      setGlobal(res.global)
      showToast('Global discount saved')
    } catch (err) {
      setError(err?.message || 'Failed to save global discount')
      showToast(err?.message || 'Failed to save global discount', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ─── Individual discounts ──────────────────────
  const openAdd = () => {
    setEditId(null)
    setForm({ packageId: '', brand: '', model: '', percent: '', note: '', isActive: true })
    setError('')
    setShowModal(true)
  }

  const openEdit = (d) => {
    setEditId(d._id)
    setForm({
      packageId: d.package?._id || d.package || '',
      brand: d.brand || '',
      model: d.model || '',
      percent: String(d.percent),
      note: d.note || '',
      isActive: d.isActive !== false,
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setError('')
  }

  const submitIndividual = async (e) => {
    e.preventDefault()
    if (!form.packageId) { setError('Please select a package'); return }
    if (!form.brand) { setError('Please select a brand'); return }
    const pct = Number(form.percent)
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) { setError('Percent must be between 1 and 100'); return }

    setSaving(true)
    setError('')
    try {
      const payload = {
        packageId: form.packageId,
        brand: form.brand,
        model: form.model || '',
        percent: pct,
        note: form.note,
        isActive: form.isActive,
      }
      if (editId) {
        await apiClient.put(`/admin/discounts/individual/${editId}`, payload)
      } else {
        await apiClient.post('/admin/discounts/individual', payload)
      }
      await fetchAll()
      showToast(editId ? 'Discount updated' : 'Discount created')
      closeModal()
    } catch (err) {
      setError(err?.message || 'Failed to save discount')
    } finally {
      setSaving(false)
    }
  }

  const toggleIndividual = async (d) => {
    try {
      await apiClient.put(`/admin/discounts/individual/${d._id}`, { isActive: !(d.isActive !== false) })
      setIndividual(individual.map(x => x._id === d._id ? { ...x, isActive: !(x.isActive !== false) } : x))
      showToast(d.isActive !== false ? 'Discount deactivated' : 'Discount activated')
    } catch (err) {
      showToast(err?.message || 'Failed to update discount', 'error')
    }
  }

  const deleteIndividual = async (d) => {
    const label = `${d.package?.name || 'Package'} · ${d.brand}${d.model ? ` ${d.model}` : ''}`
    if (!window.confirm(`Delete the discount for "${label}"?`)) return
    try {
      await apiClient.delete(`/admin/discounts/individual/${d._id}`)
      showToast('Discount deleted')
      setIndividual(individual.filter(x => x._id !== d._id))
    } catch (err) {
      showToast(err?.message || 'Failed to delete discount', 'error')
    }
  }

  if (loading) return <PageLoader />

  const selectedBrand = brands.find(b => b.name === form.brand)
  const brandModels = selectedBrand?.models || []

  const inputStyle = { background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }
  const selectStyle = { background: 'var(--bg-surface)', color: 'var(--text-primary)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }

  return (
    <div style={{ position: 'relative' }}>
      {error && !showModal && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="flex justify-between items-center animate-fade-in" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Discounts</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Set a global discount on all packages, or override it per vehicle</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ padding: '12px 28px', borderRadius: 14 }}>
          <Plus size={18} /> New Override
        </button>
      </div>

      {/* ─── Global discount card ─────────────────── */}
      <div className="glass animate-fade-in-up" style={{ padding: 32, borderRadius: 28, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-md)', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 200, height: 200, background: 'var(--accent-lime)', opacity: 0.05, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div className="flex justify-between items-start" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-12">
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(223,255,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={20} className="text-lime" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>Global Discount</h2>
              <p className="text-secondary text-body-sm">Applied to every package unless overridden below</p>
            </div>
          </div>
          <button onClick={() => setGlobal({ ...global, isActive: !global.isActive })} style={{ color: global.isActive ? 'var(--accent-lime)' : 'var(--text-tertiary)' }} title={global.isActive ? 'Active' : 'Inactive'}>
            {global.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        <div className="grid-2 gap-24" style={{ marginBottom: 24 }}>
          <div className="flex flex-col gap-8">
            <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>DISCOUNT PERCENT (%)</label>
            <input type="number" min="0" max="100" className="input-field" style={inputStyle}
              value={global.percent} onChange={e => setGlobal({ ...global, percent: e.target.value })} placeholder="e.g. 20" />
          </div>
          <div className="flex flex-col gap-8">
            <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>CUSTOMER NOTE</label>
            <input className="input-field" style={inputStyle}
              value={global.note} onChange={e => setGlobal({ ...global, note: e.target.value })} placeholder="e.g. Monsoon Sale — limited time!" />
          </div>
        </div>

        <button disabled={saving} className="btn btn-primary" onClick={saveGlobal} style={{ padding: '14px 32px', borderRadius: 16, fontWeight: 800 }}>
          {saving ? 'Saving…' : 'Save Global Discount'}
        </button>
      </div>

      {/* ─── Individual overrides ─────────────────── */}
      <div style={{ marginBottom: 24, borderBottom: '1px solid var(--divider)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>Per-Vehicle Overrides</h2>
        <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>
          {individual.length} {individual.length === 1 ? 'override' : 'overrides'}
        </span>
      </div>

      {individual.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center', borderRadius: 20, border: '1px solid var(--divider)', background: 'rgba(255,255,255,0.01)' }}>
          <div className="text-secondary" style={{ fontSize: 14 }}>No per-vehicle overrides yet. The global discount applies to all packages.</div>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 24 }}>
          {individual.map(d => (
            <div key={d._id} className="glass animate-fade-in-up" style={{ padding: 28, borderRadius: 24, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-md)', opacity: d.isActive !== false ? 1 : 0.55 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
                <span className="chip chip-lime" style={{ fontSize: 18, fontWeight: 800, padding: '6px 14px' }}>{d.percent}% OFF</span>
                <button onClick={() => toggleIndividual(d)} style={{ color: d.isActive !== false ? 'var(--accent-lime)' : 'var(--text-tertiary)' }}>
                  {d.isActive !== false ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {d.package?.name || 'Package'}
              </div>
              <div className="flex flex-wrap gap-6" style={{ marginBottom: 16 }}>
                <span className="chip" style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {d.brand}{d.model ? `: ${d.model}` : ': All models'}
                </span>
              </div>

              {d.note && (
                <div className="flex items-start gap-8" style={{ marginBottom: 20 }}>
                  <Tag size={14} className="text-secondary" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span className="text-secondary text-body-sm">{d.note}</span>
                </div>
              )}

              <div className="flex gap-12 w-full">
                <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 14, fontSize: 13, border: '1px solid var(--divider)' }} onClick={() => openEdit(d)}>
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn btn-ghost" style={{ padding: '0 16px', borderRadius: 14, border: '1px solid var(--divider)', color: 'var(--error)' }} onClick={() => deleteIndividual(d)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit modal ───────────────────────── */}
      {showModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{ width: '100%', maxWidth: 560, padding: '32px clamp(16px, 5vw, 48px) 48px', borderRadius: 32, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)', background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="flex justify-between items-start" style={{ marginBottom: 28 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>{editId ? 'Edit Override' : 'New Override'}</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Overrides the global discount for one package + vehicle</p>
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

            <form onSubmit={submitIndividual} className="flex flex-col gap-24">
              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>PACKAGE</label>
                <select className="input-field" style={selectStyle} value={form.packageId} onChange={e => setForm({ ...form, packageId: e.target.value })}>
                  <option value="">Select a package</option>
                  {packages.map(p => (
                    <option key={p._id} value={p._id} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                      {p.name} ({p.tier || 'BASIC'}) — ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2 gap-24">
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>BRAND</label>
                  <select className="input-field" style={selectStyle} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value, model: '' })}>
                    <option value="">Select brand</option>
                    {brands.map(b => (
                      <option key={b._id} value={b.name} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>MODEL</label>
                  <select className="input-field" style={selectStyle} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} disabled={!form.brand}>
                    <option value="">All models of brand</option>
                    {brandModels.map((m, i) => (
                      <option key={i} value={m} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>DISCOUNT PERCENT (%)</label>
                <input required type="number" min="1" max="100" className="input-field" style={inputStyle}
                  value={form.percent} onChange={e => setForm({ ...form, percent: e.target.value })} placeholder="e.g. 30" />
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>CUSTOMER NOTE</label>
                <input className="input-field" style={inputStyle}
                  value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Special launch offer for Swift" />
              </div>

              <div className="flex items-center gap-12">
                <input type="checkbox" id="disc-active" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-lime)' }} />
                <label htmlFor="disc-active" style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Active</label>
              </div>

              <button disabled={saving} className="btn btn-primary w-full" type="submit" style={{ padding: 18, borderRadius: 18, fontSize: 17, fontWeight: 800 }}>
                {saving ? 'Saving…' : (editId ? 'Save Changes' : 'Create Override')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

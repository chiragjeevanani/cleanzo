import PageLoader from '../../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, MapPin, Home, Briefcase, ArrowRight, Check, Pencil } from 'lucide-react'
import apiClient from '../../../services/apiClient'

const ICON_MAP = { Home, Office: Briefcase, Other: MapPin }
const COLOR_MAP = { Home: 'var(--primary-blue)', Office: 'var(--accent-lime)', Other: 'var(--text-secondary)' }

export default function SavedAddresses() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([])
  const [adding, setAdding] = useState(false)
  const [editAddressId, setEditAddressId] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ label: 'Home', societyName: '', tower: '', flat: '', city: '', state: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/customer/addresses')
        setAddresses(res.addresses || [])
      } catch {
        setError('Failed to load addresses.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!form.city || !form.state || !form.societyName || !form.flat) return
    setSaving(true)
    setError('')
    try {
      // Combine for legacy line1 support if needed, but also send granular fields
      const payload = {
        ...form,
        line1: `${form.flat}, ${form.tower ? form.tower + ', ' : ''}${form.societyName}`
      }
      
      let res;
      if (editAddressId) {
        res = await apiClient.put(`/customer/addresses/${editAddressId}`, payload)
      } else {
        res = await apiClient.post('/customer/addresses', payload)
      }
      
      setAddresses(res.addresses || [])
      setForm({ label: 'Home', societyName: '', tower: '', flat: '', city: '', state: '' })
      setStep(1)
      setAdding(false)
      setEditAddressId(null)
    } catch (err) {
      setError(err.message || 'Failed to save address.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await apiClient.delete(`/customer/addresses/${id}`)
      setAddresses(res.addresses || [])
    } catch {
      setError('Failed to delete address.')
    }
  }

  const handleEditClick = (addr) => {
    setForm({
      label: addr.label || 'Home',
      societyName: addr.societyName || '',
      tower: addr.tower || '',
      flat: addr.flat || '',
      city: addr.city || '',
      state: addr.state || ''
    })
    setEditAddressId(addr._id)
    setStep(1)
    setAdding(true)
  }

  if (loading) return <PageLoader />

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button onClick={() => navigate(-1)}  className="flex items-center gap-8" style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', outline: 'none' }}>
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Saved Addresses</span>
        </button>
        {!adding && <button className="btn btn-primary btn-sm" onClick={() => { setForm({ label: 'Home', societyName: '', tower: '', flat: '', city: '', state: '' }); setEditAddressId(null); setStep(1); setAdding(true); }}><Plus size={16} /> Add</button>}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {adding && (
        <div className="glass animate-fade-in-up" style={{ padding: '24px', borderRadius: 24, marginBottom: 16 }}>
          <div className="flex flex-col gap-20">
            {/* Address Type */}
            <div>
              <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Address Type *</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['Home', 'Office', 'Other'].map(type => {
                  const isCustom = form.label !== 'Home' && form.label !== 'Office';
                  const isSelected = type === 'Other' ? isCustom : form.label === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setForm({...form, label: type})}
                      className={`btn ${isSelected ? 'btn-primary' : 'glass'}`}
                      style={{ flex: 1, padding: '12px 0', fontSize: 14, borderRadius: 12, minWidth: 0 }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {form.label !== 'Home' && form.label !== 'Office' && (
                <input
                  className="input-field animate-fade-in"
                  placeholder="e.g. Gym, Friend's House"
                  value={form.label === 'Other' ? '' : form.label}
                  onChange={e => setForm({...form, label: e.target.value || 'Other'})}
                  style={{ width: '100%', padding: '14px 16px', marginTop: 12 }}
                  autoFocus
                />
              )}
            </div>

            {/* Building Details */}
            <div>
              <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Society / Building Name *</label>
              <input className="input-field" placeholder="e.g. Green Park Apartments" value={form.societyName} onChange={e => setForm({...form, societyName: e.target.value})} style={{ width: '100%', padding: '14px 16px' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tower / Block</label>
                <input className="input-field" placeholder="e.g. Tower C" value={form.tower} onChange={e => setForm({...form, tower: e.target.value})} style={{ width: '100%', padding: '14px 16px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Flat / House No. *</label>
                <input className="input-field" placeholder="e.g. 4B" value={form.flat} onChange={e => setForm({...form, flat: e.target.value})} style={{ width: '100%', padding: '14px 16px' }} />
              </div>
            </div>

            {/* Location */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>City *</label>
                <input className="input-field" placeholder="e.g. Bengaluru" value={form.city} onChange={e => setForm({...form, city: e.target.value})} style={{ width: '100%', padding: '14px 16px' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>State *</label>
                <input className="input-field" placeholder="e.g. Karnataka" value={form.state} onChange={e => setForm({...form, state: e.target.value})} style={{ width: '100%', padding: '14px 16px' }} />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => { setAdding(false); setEditAddressId(null); }} 
                style={{ flex: 1, padding: '14px 0', borderRadius: 12, minWidth: 0 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave} 
                disabled={saving || !form.societyName || !form.flat || !form.city || !form.state}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 12, minWidth: 0 }}
              >
                {saving ? 'Saving...' : <>Save Address <Check size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {addresses.length === 0 && !adding && (
          <div className="text-body-sm text-secondary" style={{ textAlign: 'center', marginTop: 40 }}>No saved addresses yet.</div>
        )}
        {addresses.map(a => {
          const Icon = ICON_MAP[a.label] || MapPin
          const color = COLOR_MAP[a.label] || 'var(--text-secondary)'
          return (
            <div key={a._id} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{a.label || 'Address'}</div>
                <div className="text-body-sm text-secondary" style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {a.flat ? `${a.flat}, ` : ''}{a.tower ? `${a.tower}, ` : ''}{a.societyName || a.line1}
                  <br/>
                  {a.city}{a.state ? `, ${a.state}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => handleEditClick(a)} style={{ color: 'var(--primary-blue)', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Pencil size={18} />
                </button>
                <button onClick={() => handleDelete(a._id)} style={{ color: 'var(--error)', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import PageLoader from '../../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, MapPin, Home, Briefcase } from 'lucide-react'
import apiClient from '../../../services/apiClient'

const ICON_MAP = { Home, Office: Briefcase, Other: MapPin }
const COLOR_MAP = { Home: 'var(--primary-blue)', Office: 'var(--accent-lime)', Other: 'var(--text-secondary)' }

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: 'Home', line1: '', city: '' })
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

  const handleAdd = async () => {
    if (!form.line1 || !form.city) return
    setSaving(true)
    setError('')
    try {
      const res = await apiClient.post('/customer/addresses', form)
      setAddresses(res.addresses || [])
      setForm({ label: 'Home', line1: '', city: '' })
      setAdding(false)
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

  if (loading) return <PageLoader />

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <Link to="/customer/profile" className="flex items-center gap-8">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Saved Addresses</span>
        </Link>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}><Plus size={16} /> Add</button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {adding && (
        <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius)', marginBottom: 16 }}>
          <div className="flex flex-col gap-12">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Address Type</label>
              <select className="input-field" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={{ width: '100%' }}>
                <option value="Home">Home</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Address Line</label>
              <textarea
                className="input-field"
                placeholder="e.g. Flat 4B, Tower C, Green Park..."
                value={form.line1}
                onChange={e => setForm({ ...form, line1: e.target.value })}
                style={{ width: '100%', minHeight: 80, resize: 'none' }}
              />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>City</label>
              <input
                className="input-field"
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <button disabled={saving} className={`btn btn-primary w-full ${saving ? 'opacity-50' : ''}`} onClick={handleAdd}>
              {saving ? 'Saving...' : 'Save Address'}
            </button>
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{a.label || 'Address'}</div>
                <div className="text-body-sm text-secondary" style={{ marginTop: 2 }}>{a.line1}{a.city ? `, ${a.city}` : ''}</div>
              </div>
              <button onClick={() => handleDelete(a._id)} style={{ color: 'var(--error)', padding: 8 }}>
                <Trash2 size={18} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

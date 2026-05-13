import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Edit2, ToggleLeft, ToggleRight, Plus, X, Check, Package } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminPackages() {
  const { showToast } = useToast()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editPkg, setEditPkg] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    tier: 'STANDARD',
    price: '',
    category: 'sedan',
    features: '',
    popular: false
  })

  const closeModal = () => {
    setShowAddModal(false)
    setEditPkg(null)
    setFormData({ name: '', tier: 'STANDARD', price: '', category: 'sedan', features: '', popular: false })
  }

  const handleEdit = (pkg) => {
    setEditPkg(pkg)
    setFormData({
      name: pkg.name,
      tier: pkg.tier || 'STANDARD',
      price: String(pkg.price),
      category: pkg.category || 'sedan',
      features: (pkg.features || []).join(', '),
      popular: pkg.popular || false,
    })
    setShowAddModal(true)
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const res = await apiClient.get('/admin/packages')
      setPackages(res.packages || [])
    } catch (err) {
      setError('Failed to load packages.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = async (id, isActive) => {
    try {
      await apiClient.put(`/admin/packages/${id}`, { isActive: !isActive })
      setPackages(packages.map(p => p._id === id ? { ...p, isActive: !isActive } : p))
    } catch (err) {
      setError(err?.message || 'Failed to update package status.')
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) { setError('Package name is required'); return }
    if (!formData.price || Number(formData.price) <= 0) { setError('Price must be greater than 0'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        features: formData.features.split(',').map(f => f.trim()).filter(f => f)
      }
      if (editPkg) {
        await apiClient.put(`/admin/packages/${editPkg._id}`, payload)
      } else {
        await apiClient.post('/admin/packages', payload)
      }
      await fetchPackages()
      showToast(editPkg ? 'Package updated' : 'Package created')
      closeModal()
    } catch (err) {
      setError(err?.message || (editPkg ? 'Failed to update package' : 'Failed to add package'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div style={{ position: 'relative' }}>
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      <div className="flex justify-between items-center animate-fade-in" style={{ marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>Service Packages</h1>
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Manage vehicle-specific subscription plans</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '12px 28px', borderRadius: 14 }}>
          <Plus size={18} /> New Package
        </button>
      </div>

      <div className="grid-3" style={{ gap: 32 }}>
        {packages.length === 0 ? (
          <div className="glass col-span-3" style={{ padding: 64, textAlign: 'center' }}>
            <Package size={48} className="text-tertiary mb-16" />
            <div className="text-secondary">No packages found. Start by creating your first plan.</div>
          </div>
        ) : packages.map((pkg, i) => (
          <div key={pkg._id} className="glass animate-fade-in-up" 
            style={{ 
              padding: 32, 
              opacity: pkg.isActive ? 1 : 0.6,
              animationDelay: `${i * 100}ms`,
              borderRadius: 28,
              border: '1px solid var(--border-glass)',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              overflow: 'hidden'
            }}>
            
            {/* Glossy Overlay */}
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
              <span className="chip chip-ghost" style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 10 }}>{pkg.tier || 'STANDARD'}</span>
              <button onClick={() => toggle(pkg._id, pkg.isActive)} style={{ color: pkg.isActive ? 'var(--accent-lime)' : 'var(--text-tertiary)', transition: 'all 0.3s' }}>
                {pkg.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
            
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{pkg.name}</div>
            
            <div className="flex gap-8 mb-24">
               <span className="chip" style={{ fontSize: 10, background: 'rgba(var(--primary-blue-rgb), 0.1)', color: 'var(--primary-blue)', border: '1px solid rgba(var(--primary-blue-rgb), 0.2)' }}>{pkg.category}</span>
               {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 10, boxShadow: '0 4px 12px rgba(223,255,0,0.2)' }}>POPULAR</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-secondary)' }}>₹</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{pkg.price}</span>
              <span className="text-body-sm text-tertiary" style={{ marginLeft: 4 }}>/ month</span>
            </div>

            <div className="flex flex-col gap-12" style={{ marginBottom: 32, borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
              {(pkg.features || []).map((f, i) => (
                <div key={i} className="flex items-center gap-10 text-body-sm text-secondary">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-lime)' }} />
                  {f}
                </div>
              ))}
            </div>

            <button className="btn btn-ghost w-full" style={{ borderRadius: 14, fontSize: 13, border: '1px solid var(--divider)' }} onClick={() => handleEdit(pkg)}>
              <Edit2 size={14} /> Edit Details
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" 
            style={{ 
              width: 640, 
              padding: '56px 64px', 
              borderRadius: 40, 
              border: '1px solid var(--border-glass)', 
              boxShadow: 'var(--shadow-lg)',
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}>
            
            {/* Background Accent Glow */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 240, height: 240, background: 'var(--accent-lime)', opacity: 0.05, filter: 'blur(80px)', pointerEvents: 'none' }} />

            <div className="flex justify-between items-start mb-48">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>{editPkg ? 'Edit Package' : 'Create Package'}</h2>
                <p className="text-secondary" style={{ fontSize: 16, marginTop: 6 }}>{editPkg ? 'Update this service plan' : 'Design a new premium service subscription'}</p>
              </div>
              <button className="glass flex items-center justify-center hover:scale-110 transition-all"
                onClick={closeModal}
                style={{ width: 44, height: 44, borderRadius: 16 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-32">
              <div className="flex flex-col gap-12">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>PACKAGE NAME</label>
                <input required className="input-field" 
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 17 }}
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Elite Sedan Care" />
              </div>

              <div className="grid-2 gap-32">
                <div className="flex flex-col gap-12">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>MONTHLY PRICE (₹)</label>
                  <input required type="number" className="input-field" 
                    style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 17 }}
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="799" />
                </div>
                <div className="flex flex-col gap-12">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>SERVICE TIER</label>
                  <select className="input-field" 
                    style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 17 }}
                    value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value})}>
                    <option value="BASIC">BASIC</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="ELITE">ELITE</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-12">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>VEHICLE CATEGORY</label>
                <select className="input-field" 
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: '18px 24px', border: '1px solid var(--divider)', fontSize: 17 }}
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="scooty">Scooty</option>
                  <option value="bike">Bike</option>
                  <option value="small_car">Small Car</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="sedan">Sedan</option>
                  <option value="mpv">MPV</option>
                  <option value="suv">SUV</option>
                  <option value="premium">Premium/Luxury</option>
                </select>
              </div>

              <div className="flex flex-col gap-12">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}>INCLUDED FEATURES</label>
                <textarea className="input-field" 
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: '18px 24px', border: '1px solid var(--divider)', minHeight: 140, fontSize: 16, resize: 'none', lineHeight: '1.6' }}
                  value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="Wash, Vacuum, Polish (separated by commas)" />
              </div>

              <div className="flex items-center gap-16 cursor-pointer group" onClick={() => setFormData({...formData, popular: !formData.popular})}>
                <div className={`flex items-center justify-center w-28 h-28 rounded-8 border-2 transition-all ${formData.popular ? 'bg-lime border-lime' : 'border-divider'}`}>
                  {formData.popular && <Check size={18} color="#000" strokeWidth={3} />}
                </div>
                <span className="text-body-md font-bold" style={{ color: formData.popular ? 'var(--accent-lime)' : 'var(--text-secondary)' }}>Highlight as Popular / Trending Plan</span>
              </div>

              <button disabled={saving} className="btn btn-primary w-full" type="submit" 
                style={{ padding: '22px', borderRadius: 24, fontSize: 18, fontWeight: 800, marginTop: 8, boxShadow: 'var(--shadow-glow-lime)', transition: 'all 0.3s' }}>
                {saving ? (editPkg ? 'Saving...' : 'Creating your plan...') : (editPkg ? 'Save Changes' : 'Publish Service Package')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

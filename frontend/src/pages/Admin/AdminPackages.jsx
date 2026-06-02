import PageLoader from '../../components/PageLoader'
import { useState, useEffect } from 'react'
import { Edit2, ToggleLeft, ToggleRight, Plus, X, Check, Package, Trash2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminPackages() {
  const { showToast } = useToast()
  const [packages, setPackages] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editPkg, setEditPkg] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    tier: 'BASIC',
    price: '',
    trialPrice: '',
    features: '',
    excludedFeatures: '',
    popular: false
  })

  // Selected brands and models state:
  // { Honda: { active: true, all: true, models: [] }, Maruti: { active: true, all: false, models: ['Creta'] } }
  const [selectedModels, setSelectedModels] = useState({})

  const otherActivePlansInTier = packages.filter(pkg => 
    pkg.isActive && 
    (pkg.tier || 'BASIC').toUpperCase() === (formData.tier || 'BASIC').toUpperCase() && 
    (!editPkg || pkg._id !== editPkg._id)
  )

  const isModelCoveredInOtherPlans = (brandName, modelName) => {
    return otherActivePlansInTier.some(pkg => 
      pkg.applicableModels?.some(app => 
        app.brand === brandName && (app.models?.length === 0 || app.models?.includes(modelName))
      )
    )
  }

  const isBrandFullyCoveredInOtherPlans = (brandName) => {
    const brandObj = brands.find(b => b.name === brandName)
    if (!brandObj) return false

    // Check if another plan covers All models of this brand
    const coversAll = otherActivePlansInTier.some(pkg => 
      pkg.applicableModels?.some(app => app.brand === brandName && app.models?.length === 0)
    )
    if (coversAll) return true

    // Check if all models of this brand are individually covered
    const brandModels = brandObj.models || []
    if (brandModels.length === 0) return false
    return brandModels.every(model => isModelCoveredInOtherPlans(brandName, model))
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditPkg(null)
    setFormData({ name: '', tier: 'BASIC', price: '', trialPrice: '', features: '', excludedFeatures: '', popular: false })
    setSelectedModels({})
    setError('')
  }

  const handleEdit = (pkg) => {
    setEditPkg(pkg)
    setFormData({
      name: pkg.name,
      tier: pkg.tier || 'BASIC',
      price: String(pkg.price),
      trialPrice: pkg.trialPrice !== undefined && pkg.trialPrice !== null ? String(pkg.trialPrice) : '',
      features: (pkg.features || []).join(', '),
      excludedFeatures: (pkg.excludedFeatures || []).join(', '),
      popular: pkg.popular || false,
    })

    // Map package's applicableModels to selectedModels state
    const initialSelected = {}
    if (pkg.applicableModels) {
      pkg.applicableModels.forEach(app => {
        initialSelected[app.brand] = {
          active: true,
          all: !app.models || app.models.length === 0,
          models: app.models || []
        }
      })
    }
    setSelectedModels(initialSelected)
    setShowAddModal(true)
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      const [pkgRes, brandRes] = await Promise.all([
        apiClient.get('/admin/packages'),
        apiClient.get('/admin/brands')
      ])
      setPackages(pkgRes.packages || [])
      setBrands(brandRes.brands || [])
    } catch (err) {
      setError('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = async (id, isActive) => {
    try {
      await apiClient.put(`/admin/packages/${id}`, { isActive: !isActive })
      setPackages(packages.map(p => p._id === id ? { ...p, isActive: !isActive } : p))
      showToast(isActive ? 'Package deactivated' : 'Package activated')
    } catch (err) {
      setError(err?.message || 'Failed to update package status.')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${name}"?`)) return
    try {
      await apiClient.delete(`/admin/packages/${id}`)
      showToast('Package deleted successfully')
      fetchPackages()
    } catch (err) {
      setError(err?.message || 'Failed to delete package.')
      showToast(err?.message || 'Failed to delete package.', 'error')
    }
  }


  // Model Selection Handlers
  const handleToggleBrand = (brandName) => {
    setSelectedModels(prev => {
      const isCurrentlyActive = !!prev[brandName]?.active
      return {
        ...prev,
        [brandName]: {
          active: !isCurrentlyActive,
          all: true,
          models: []
        }
      }
    })
  }

  const handleToggleAllModels = (brandName) => {
    setSelectedModels(prev => ({
      ...prev,
      [brandName]: {
        ...prev[brandName],
        all: !prev[brandName]?.all,
        models: [] // reset specific models
      }
    }))
  }

  const handleToggleModelSelection = (brandName, modelName) => {
    setSelectedModels(prev => {
      const currentModels = prev[brandName]?.models || []
      const isSelected = currentModels.includes(modelName)
      const nextModels = isSelected 
        ? currentModels.filter(m => m !== modelName)
        : [...currentModels, modelName]
      return {
        ...prev,
        [brandName]: {
          ...prev[brandName],
          all: false, // uncheck "All" when selecting specific models
          models: nextModels
        }
      }
    })
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) { setError('Package name is required'); return }
    if (!formData.price || Number(formData.price) <= 0) { setError('Price must be greater than 0'); return }
    
    // Parse applicableModels, filtering out models covered in other packages of this tier
    const applicableModels = Object.keys(selectedModels)
      .filter(brandName => selectedModels[brandName]?.active)
      .map(brandName => {
        const brandObj = brands.find(b => b.name === brandName)
        const brandModels = brandObj?.models || []
        const availableModels = brandModels.filter(model => !isModelCoveredInOtherPlans(brandName, model))
        const showAllModelsCheckbox = availableModels.length === brandModels.length
        const useAllModels = selectedModels[brandName].all && showAllModelsCheckbox

        return {
          brand: brandName,
          models: useAllModels ? [] : (selectedModels[brandName].models || []).filter(model => availableModels.includes(model))
        }
      })
      .filter(app => {
        // If a brand is set to "All" (models list is empty), or has specific models selected, keep it.
        // Otherwise, if they select a brand but it has no models selected and no longer supports "All", filter it out.
        const brandObj = brands.find(b => b.name === app.brand)
        const brandModels = brandObj?.models || []
        const availableModels = brandModels.filter(model => !isModelCoveredInOtherPlans(app.brand, model))
        const showAllModelsCheckbox = availableModels.length === brandModels.length
        const useAllModels = selectedModels[app.brand].all && showAllModelsCheckbox

        return useAllModels || app.models.length > 0
      })

    if (applicableModels.length === 0) {
      setError('Please select at least one brand/model for this package')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        trialPrice: formData.trialPrice ? Number(formData.trialPrice) : null,
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
        excludedFeatures: formData.excludedFeatures.split(',').map(f => f.trim()).filter(f => f),
        applicableModels
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

  const getCoverageStatus = (tierName) => {
    if (brands.length === 0) return false
    
    // Filter active packages for this specific tier
    const tierPackages = packages.filter(pkg => pkg.isActive && (pkg.tier || 'BASIC').toUpperCase() === tierName.toUpperCase())
    if (tierPackages.length === 0) return false

    // Check every brand
    for (const brand of brands) {
      const brandModels = brand.models || []
      if (brandModels.length === 0) {
        const brandIsCovered = tierPackages.some(pkg => 
          pkg.applicableModels?.some(app => app.brand === brand.name)
        )
        if (!brandIsCovered) return false
        continue
      }

      // Check if every model of this brand is covered
      for (const model of brandModels) {
        const modelIsCovered = tierPackages.some(pkg => 
          pkg.applicableModels?.some(app => 
            app.brand === brand.name && (app.models?.length === 0 || app.models?.includes(model))
          )
        )
        if (!modelIsCovered) return false
      }
    }
    return true
  }

  const renderTierSection = (tierName, tierLabel, tierPlans) => {
    const isCovered = getCoverageStatus(tierName);

    return (
      <div style={{ marginBottom: 48 }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--divider)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              {tierLabel}
            </h2>
            <span className="chip" style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>
              {tierPlans.length} {tierPlans.length === 1 ? 'plan' : 'plans'}
            </span>
          </div>
          {isCovered && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              color: 'var(--accent-lime)', 
              fontSize: 12, 
              fontWeight: 600, 
              background: 'rgba(223,255,0,0.08)', 
              padding: '6px 14px', 
              borderRadius: 12, 
              border: '1px solid rgba(223,255,0,0.15)' 
            }}>
              <Check size={14} /> All models of all brands covered
            </div>
          )}
        </div>

        {tierPlans.length === 0 ? (
          <div className="glass" style={{ padding: '32px', textAlign: 'center', borderRadius: 20, border: '1px solid var(--divider)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="text-secondary" style={{ fontSize: 14 }}>No packages configured under {tierLabel}.</div>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: 24 }}>
            {tierPlans.map((pkg) => (
              <div key={pkg._id} className="glass animate-fade-in-up" 
                style={{ 
                  padding: 32, 
                  opacity: pkg.isActive ? 1 : 0.6,
                  borderRadius: 28,
                  border: '1px solid var(--border-glass)',
                  boxShadow: 'var(--shadow-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 340
                }}>
                
                {/* Glossy Overlay */}
                <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div>
                  <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
                    <span className="chip chip-ghost" style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 10 }}>{pkg.tier || 'STANDARD'}</span>
                    <button onClick={() => toggle(pkg._id, pkg.isActive)} style={{ color: pkg.isActive ? 'var(--accent-lime)' : 'var(--text-tertiary)', transition: 'all 0.3s' }}>
                      {pkg.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                  </div>
                  
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{pkg.name}</div>
                  
                  {/* Brands and Models mapping display */}
                  <div className="flex flex-wrap gap-6 mb-24" style={{ maxHeight: 72, overflowY: 'auto' }}>
                    {pkg.applicableModels && pkg.applicableModels.length > 0 ? (
                      pkg.applicableModels.map((app, idx) => (
                        <span key={idx} className="chip" style={{ fontSize: 10, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                          {app.brand}: {app.models && app.models.length > 0 ? app.models.join(', ') : 'All'}
                        </span>
                      ))
                    ) : (
                      <span className="text-secondary text-body-xs">No model mapping configured</span>
                    )}
                    {pkg.popular && <span className="chip chip-lime" style={{ fontSize: 10, boxShadow: '0 4px 12px rgba(223,255,0,0.2)' }}>POPULAR</span>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-secondary)' }}>₹</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>{pkg.price}</span>
                      <span className="text-body-sm text-tertiary" style={{ marginLeft: 4 }}>/ month</span>
                    </div>
                    {pkg.trialPrice !== undefined && pkg.trialPrice !== null && (
                      <span className="chip chip-lime" style={{ fontSize: 11, padding: '6px 12px', borderRadius: 10 }}>
                        Trial: ₹{pkg.trialPrice}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
                    {(pkg.features || []).map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-lime)', flexShrink: 0 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-12 w-full">
                  <button className="btn btn-ghost" style={{ flex: 1, borderRadius: 14, fontSize: 13, border: '1px solid var(--divider)' }} onClick={() => handleEdit(pkg)}>
                    <Edit2 size={14} /> Edit Details
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '0 16px', borderRadius: 14, border: '1px solid var(--divider)', color: 'var(--error)' }} onClick={() => handleDelete(pkg._id, pkg.name)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <PageLoader />

  const basicPlans = packages.filter(p => (p.tier || 'BASIC').toUpperCase() === 'BASIC')
  const standardPlans = packages.filter(p => (p.tier || '').toUpperCase() === 'STANDARD')
  const premiumPlans = packages.filter(p => (p.tier || '').toUpperCase() === 'PREMIUM')

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
          <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Manage model-specific subscription plans</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '12px 28px', borderRadius: 14 }}>
          <Plus size={18} /> New Package
        </button>
      </div>

      <div className="flex flex-col" style={{ gap: 16 }}>
        {renderTierSection('BASIC', 'Basic Tier', basicPlans)}
        {renderTierSection('STANDARD', 'Standard Tier', standardPlans)}
        {renderTierSection('PREMIUM', 'Premium Tier', premiumPlans)}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" 
            style={{ 
              width: '100%',
              maxWidth: 700, 
              padding: '32px clamp(16px, 5vw, 48px) 48px clamp(16px, 5vw, 48px)', 
              borderRadius: 32, 
              border: '1px solid var(--border-glass)', 
              boxShadow: 'var(--shadow-lg)',
              background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
              position: 'relative',
              overflowY: 'auto',
              overflowX: 'hidden',
              maxHeight: '90vh'
            }}>
            
            {/* Background Accent Glow */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 240, height: 240, background: 'var(--accent-lime)', opacity: 0.05, filter: 'blur(80px)', pointerEvents: 'none' }} />

            <div className="flex justify-between items-start mb-36">
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>{editPkg ? 'Edit Package' : 'Create Package'}</h2>
                <p className="text-secondary" style={{ fontSize: 15, marginTop: 4 }}>{editPkg ? 'Update this service plan' : 'Design a new premium service subscription'}</p>
              </div>
              <button className="glass flex items-center justify-center hover:scale-110 transition-all"
                onClick={closeModal}
                style={{ width: 44, height: 44, borderRadius: 16 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col gap-24">
              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>PLAN CATEGORY</label>
                <select className="input-field" 
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                  value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value})}>
                  <option value="BASIC" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>BASIC</option>
                  <option value="STANDARD" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>STANDARD</option>
                  <option value="PREMIUM" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>PREMIUM</option>
                </select>
              </div>

              <div className="grid-2 gap-24">
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>MONTHLY PRICE (₹)</label>
                  <input required type="number" className="input-field" 
                    style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 599" />
                </div>
                <div className="flex flex-col gap-8">
                  <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>TRIAL PRICE (₹)</label>
                  <input type="number" className="input-field" 
                    style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                    value={formData.trialPrice} onChange={e => setFormData({...formData, trialPrice: e.target.value})} placeholder="e.g. 30 (Optional)" />
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>PACKAGE NAME</label>
                <input required className="input-field" 
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', fontSize: 16 }}
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Basic Sedan Care" />
              </div>

              {/* Brands and Models Picker */}
              <div className="flex flex-col" style={{ gap: 10 }}>
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>APPLICABLE BRANDS & MODELS</label>
                <div className="glass" style={{ padding: '20px 24px', borderRadius: 16, border: '1px solid var(--divider)', maxHeight: 240, overflowY: 'auto', background: 'rgba(255,255,255,0.01)' }}>
                  {brands.length === 0 ? (
                    <div className="text-secondary text-body-sm text-center">No brands found. Configure them first in Brands & Models.</div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 16 }}>
                      {brands
                        .filter(brand => !isBrandFullyCoveredInOtherPlans(brand.name))
                        .map(brand => {
                          const isBrandActive = !!selectedModels[brand.name]?.active
                          const availableModels = (brand.models || []).filter(model => !isModelCoveredInOtherPlans(brand.name, model))
                          const showAllModelsCheckbox = availableModels.length === (brand.models || []).length
                          const isAllModels = !!selectedModels[brand.name]?.all && showAllModelsCheckbox
                          const activeModels = selectedModels[brand.name]?.models || []

                          return (
                            <div key={brand._id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {/* Brand Header Toggle */}
                              <div className="flex items-center" style={{ gap: 12 }}>
                                <input 
                                  type="checkbox" 
                                  id={`brand-select-${brand._id}`}
                                  checked={isBrandActive}
                                  onChange={() => handleToggleBrand(brand.name)}
                                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-lime)' }}
                                />
                                <label htmlFor={`brand-select-${brand._id}`} style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', color: 'var(--text-primary)' }}>
                                  {brand.name}
                                </label>
                              </div>

                              {/* Brand Models Selection Details */}
                              {isBrandActive && (
                                <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-slide-down">
                                  {showAllModelsCheckbox && (
                                    <div className="flex items-center" style={{ gap: 10 }}>
                                      <input 
                                        type="checkbox" 
                                        id={`brand-all-models-${brand._id}`}
                                        checked={isAllModels}
                                        onChange={() => handleToggleAllModels(brand.name)}
                                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent-lime)' }}
                                      />
                                      <label htmlFor={`brand-all-models-${brand._id}`} style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        All models of {brand.name}
                                      </label>
                                    </div>
                                  )}

                                  {(!isAllModels || !showAllModelsCheckbox) && availableModels.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                      {availableModels.map((model, idx) => {
                                        const isModelChecked = activeModels.includes(model)
                                        return (
                                          <label 
                                            key={idx} 
                                            style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: 6, 
                                              fontSize: 12, 
                                              cursor: 'pointer',
                                              padding: '6px 12px',
                                              borderRadius: 8,
                                              border: `1px solid ${isModelChecked ? 'var(--accent-lime)' : 'var(--divider)'}`,
                                              background: isModelChecked ? 'rgba(223,255,0,0.08)' : 'rgba(255,255,255,0.02)',
                                              color: isModelChecked ? 'var(--accent-lime)' : 'var(--text-secondary)',
                                              transition: 'all 0.2s',
                                              fontWeight: isModelChecked ? 600 : 400
                                            }}
                                          >
                                            <input 
                                              type="checkbox" 
                                              checked={isModelChecked}
                                              onChange={() => handleToggleModelSelection(brand.name, model)}
                                              style={{ display: 'none' }}
                                            />
                                            {model}
                                          </label>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>WHAT'S INCLUDED</label>
                <textarea className="input-field"
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', minHeight: 100, fontSize: 15, resize: 'none', lineHeight: '1.5' }}
                  value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="Exterior clean, Vacuum, Tyre polish (separated by commas)" />
                <span className="text-tertiary" style={{ fontSize: 11 }}>Shown as the "Includes" list on the customer plan detail page.</span>
              </div>

              <div className="flex flex-col gap-8">
                <label className="text-label" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>WHAT'S EXCLUDED</label>
                <textarea className="input-field"
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '16px 20px', border: '1px solid var(--divider)', minHeight: 80, fontSize: 15, resize: 'none', lineHeight: '1.5' }}
                  value={formData.excludedFeatures} onChange={e => setFormData({...formData, excludedFeatures: e.target.value})} placeholder="Interior shampoo, Engine bay detailing (separated by commas)" />
                <span className="text-tertiary" style={{ fontSize: 11 }}>Shown as the "Does not include" list on the customer plan detail page.</span>
              </div>

              <div className="flex items-center" style={{ gap: 12 }}>
                <input 
                  type="checkbox" 
                  id="pkg-popular"
                  checked={formData.popular} 
                  onChange={e => setFormData({...formData, popular: e.target.checked})} 
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-lime)' }}
                />
                <label htmlFor="pkg-popular" style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                  Highlight as Popular / Trending Plan
                </label>
              </div>

              <button disabled={saving} className="btn btn-primary w-full" type="submit" 
                style={{ padding: '18px', borderRadius: 18, fontSize: 17, fontWeight: 800, marginTop: 4, boxShadow: 'var(--shadow-glow-lime)', transition: 'all 0.3s' }}>
                {saving ? (editPkg ? 'Saving...' : 'Creating your plan...') : (editPkg ? 'Save Changes' : 'Publish Service Package')}
              </button>
              <div style={{ height: 12 }} />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

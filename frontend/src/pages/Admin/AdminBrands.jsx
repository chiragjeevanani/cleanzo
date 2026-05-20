import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminBrands() {
  const { showToast } = useToast()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  // Form states
  const [brandName, setBrandName] = useState('')
  const [isActive, setIsActive] = useState(true)
  
  // Expanded brand ID for model management
  const [expandedBrandId, setExpandedBrandId] = useState(null)
  const [newModelName, setNewModelName] = useState('')

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/admin/brands')
      setBrands(res.brands || [])
    } catch (err) {
      showToast('Failed to load brands', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBrand = async () => {
    if (!brandName.trim()) return showToast('Brand name is required', 'error')
    setSaving(true)
    try {
      if (editingId) {
        await apiClient.put(`/admin/brands/${editingId}`, { name: brandName.trim(), isActive })
        showToast('Brand updated successfully')
      } else {
        await apiClient.post('/admin/brands', { name: brandName.trim(), isActive, models: [] })
        showToast('Brand created successfully')
      }
      setEditingId(null)
      setBrandName('')
      setIsActive(true)
      fetchBrands()
    } catch (err) {
      showToast(err.message || 'Failed to save brand', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('Are you sure you want to delete this brand and all its models?')) return
    try {
      await apiClient.delete(`/admin/brands/${id}`)
      showToast('Brand deleted')
      if (expandedBrandId === id) setExpandedBrandId(null)
      fetchBrands()
    } catch (err) {
      showToast('Failed to delete brand', 'error')
    }
  }

  const startEditBrand = (brand) => {
    setEditingId(brand._id)
    setBrandName(brand.name)
    setIsActive(brand.isActive)
  }

  const handleAddModel = async (brand) => {
    if (!newModelName.trim()) return showToast('Model name cannot be empty', 'error')
    
    // Check if model already exists
    if (brand.models.some(m => m.toLowerCase() === newModelName.trim().toLowerCase())) {
      return showToast('Model already exists for this brand', 'error')
    }

    const updatedModels = [...brand.models, newModelName.trim()]
    try {
      await apiClient.put(`/admin/brands/${brand._id}`, { 
        name: brand.name, 
        isActive: brand.isActive, 
        models: updatedModels 
      })
      showToast('Model added successfully')
      setNewModelName('')
      fetchBrands()
    } catch (err) {
      showToast('Failed to add model', 'error')
    }
  }

  const handleRemoveModel = async (brand, modelToRemove) => {
    if (!window.confirm(`Are you sure you want to remove model "${modelToRemove}"?`)) return
    
    const updatedModels = brand.models.filter(m => m !== modelToRemove)
    try {
      await apiClient.put(`/admin/brands/${brand._id}`, { 
        name: brand.name, 
        isActive: brand.isActive, 
        models: updatedModels 
      })
      showToast('Model removed successfully')
      fetchBrands()
    } catch (err) {
      showToast('Failed to remove model', 'error')
    }
  }

  if (loading) return <div className="p-8">Loading brands...</div>

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      <div className="flex justify-between items-center mb-24">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Brands & Models</h1>
          <p className="text-secondary">Configure manufacturers and associated vehicle models for packages and user registration</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Brand List */}
        <div className="flex flex-col gap-16">
          {brands.length === 0 ? (
            <div className="glass p-24 text-center text-secondary">No brands configured yet.</div>
          ) : (
            brands.map((brand) => {
              const isExpanded = expandedBrandId === brand._id
              return (
                <div key={brand._id} className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div 
                      onClick={() => setExpandedBrandId(isExpanded ? null : brand._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span style={{ fontWeight: 700, fontSize: 18 }}>{brand.name}</span>
                      {!brand.isActive && <span className="chip chip-ghost" style={{ fontSize: 9 }}>Inactive</span>}
                      <span className="text-body-sm text-tertiary" style={{ marginLeft: 8 }}>({brand.models?.length || 0} models)</span>
                    </div>

                    <div className="flex gap-8">
                      <button onClick={() => startEditBrand(brand)} className="btn-icon btn-glass" style={{ width: 32, height: 32 }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteBrand(brand._id)} className="btn-icon btn-glass" style={{ width: 32, height: 32, color: 'var(--error)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="animate-slide-down" style={{ marginTop: 12, paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="divider" style={{ margin: 0, opacity: 0.3 }} />
                      
                      {/* Model List */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {brand.models && brand.models.length > 0 ? (
                          brand.models.map((model, idx) => (
                            <span 
                              key={idx} 
                              className="glass flex items-center gap-6" 
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: 12, 
                                fontSize: 13,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-glass)'
                              }}
                            >
                              {model}
                              <button 
                                onClick={() => handleRemoveModel(brand, model)}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--error)', 
                                  cursor: 'pointer', 
                                  padding: 0, 
                                  display: 'flex', 
                                  alignItems: 'center' 
                                }}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-secondary text-body-sm">No models registered under this brand.</span>
                        )}
                      </div>

                      {/* Add Model Form */}
                      <div className="flex gap-8" style={{ marginTop: 6 }}>
                        <input 
                          className="input-field" 
                          placeholder="Add new model (e.g. Civic)" 
                          value={newModelName}
                          onChange={e => setNewModelName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddModel(brand) }}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: 12 }}
                        />
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleAddModel(brand)}
                          style={{ padding: '10px 16px', borderRadius: 12 }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Add/Edit Brand Form */}
        <div className="glass" style={{ padding: 24, position: 'sticky', top: 24 }}>
          <h3 style={{ marginBottom: 20 }}>{editingId ? 'Edit Brand' : 'Add New Brand'}</h3>
          <div className="flex flex-col gap-16">
            <div>
              <label className="text-label text-secondary block mb-6">Brand Name</label>
              <input 
                className="input-field" 
                placeholder="e.g. Honda, Suzuki, Toyota" 
                value={brandName} 
                onChange={e => setBrandName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-10">
              <input 
                type="checkbox" 
                id="brand-active" 
                checked={isActive} 
                onChange={e => setIsActive(e.target.checked)} 
              />
              <label htmlFor="brand-active" style={{ cursor: 'pointer', fontWeight: 600 }}>Active & Visible</label>
            </div>

            <div className="flex gap-12 mt-8">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveBrand} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : (editingId ? 'Update Brand' : 'Create Brand')}
              </button>
              {editingId && (
                <button 
                  className="btn btn-ghost" 
                  onClick={() => { setEditingId(null); setBrandName(''); setIsActive(true) }}
                >
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

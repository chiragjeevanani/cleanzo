import Skeleton from '../../components/Skeleton'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Car, ChevronDown, X, Upload, Pencil, EyeOff } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { useCustomerData } from '../../context/CustomerDataContext'

const EMPTY_FORM = { brand: '', model: '', number: '', flatNumber: '', blockTower: '', slotPillar: '', category: 'sedan', color: '', photos: [] }

export default function VehicleManager() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { vehicles, loading: dataLoading, refreshVehicles } = useCustomerData()
  
  const [adding, setAdding] = useState(false)
  const [editVehicle, setEditVehicle] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [brandsList, setBrandsList] = useState([])
  const [modelsList, setModelsList] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const fileInputRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmHideId, setConfirmHideId] = useState(null)
  const [loadingBrands, setLoadingBrands] = useState(true)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/public/brands')
      setBrandsList(res.brands || [])
    } catch (err) {
      console.error('Failed to load brands:', err)
    } finally {
      setLoadingBrands(false)
    }
  }

  const handleBrandChange = (brandName) => {
    const selectedBrand = brandsList.find(b => b.name === brandName)
    setForm(prev => ({ ...prev, brand: brandName, model: '' }))
    setModelsList(selectedBrand ? selectedBrand.models : [])
  }

  const handleToggleAdd = () => {
    setEditVehicle(null)
    setForm(EMPTY_FORM)
    setModelsList([])
    setImagePreviews([])
    setAdding(!adding)
    setError('')
  }

  const startEdit = (v) => {
    setEditVehicle(v)
    setForm({
      brand: v.brand || '',
      model: v.model || '',
      number: v.number || '',
      flatNumber: v.flatNumber || '',
      blockTower: v.blockTower || '',
      slotPillar: v.slotPillar || '',
      category: v.category || 'sedan',
      color: v.color || '',
      photos: []
    })
    const selectedBrand = brandsList.find(b => b.name === v.brand)
    setModelsList(selectedBrand ? selectedBrand.models : [])
    setImagePreviews([]) // clear previews for upload input
    setAdding(true)
    setError('')
  }

  const saveVehicle = async () => {
    if (!form.brand || !form.model || !form.number || !form.flatNumber) {
      setError('Brand, model, plate number, and flat number are required')
      return
    }
    const plateClean = form.number.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/.test(plateClean) && plateClean.length < 4) {
      setError('Enter a valid vehicle registration number (e.g. MH01AB1234)')
      return
    }
    if (!editVehicle && form.photos.length === 0) {
      setError('Please upload at least 1 image of the vehicle')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('brand', form.brand)
      formData.append('model', form.model)
      formData.append('number', form.number.toUpperCase())
      formData.append('flatNumber', form.flatNumber || '')
      formData.append('blockTower', form.blockTower || '')
      formData.append('slotPillar', form.slotPillar || '')
      formData.append('category', form.category)
      if (form.color) formData.append('color', form.color)
      
      form.photos.forEach(file => {
        formData.append('photos', file)
      })

      if (editVehicle) {
        await apiClient.uploadForm(`/customer/vehicles/${editVehicle._id}`, formData, 'PUT')
        showToast('Vehicle updated successfully')
      } else {
        await apiClient.uploadForm('/customer/vehicles', formData, 'POST')
        showToast('Vehicle added successfully')
      }
      
      setForm(EMPTY_FORM)
      setModelsList([])
      setImagePreviews([])
      setAdding(false)
      setEditVehicle(null)
      refreshVehicles()
    } catch (err) {
      setError(err.message || 'Failed to save vehicle.')
    } finally {
      setSubmitting(false)
    }
  }

  const hideVehicle = async (id) => {
    try {
      await apiClient.delete(`/customer/vehicles/${id}`)
      setConfirmHideId(null)
      refreshVehicles()
      showToast('Vehicle hidden successfully')
    } catch (err) {
      setConfirmHideId(null)
      setError('Failed to hide vehicle.')
    }
  }

  const loading = dataLoading.vehicles || loadingBrands

  if (loading && !vehicles.length) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
        <div>
          <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 8 }} />
        </div>
        <div className="skeleton" style={{ width: 80, height: 40, borderRadius: 16, flexShrink: 0 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        <div className="flex flex-col gap-16 mt-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24 }}>
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: 140, height: 18, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6 }} />
              </div>
              <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const selectStyle = { width: '100%', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', paddingRight: 36 }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (form.photos.length + files.length > 5) {
      setError('You can only upload up to 5 images per vehicle.')
      return
    }
    const newPhotos = [...form.photos, ...files]
    setForm({ ...form, photos: newPhotos })
    
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
  }

  const removeImage = (index) => {
    const newPhotos = [...form.photos]
    newPhotos.splice(index, 1)
    setForm({ ...form, photos: newPhotos })
    
    const newPreviews = [...imagePreviews]
    URL.revokeObjectURL(newPreviews[index])
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button 
          onClick={() => {
            if (adding) {
              setAdding(false)
              setEditVehicle(null)
            } else {
              navigate(-1)
            }
          }} 
          className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0"
        >
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>My Vehicles</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleToggleAdd}>
          {adding ? 'Cancel' : <><Plus size={16} /> Add</>}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {adding && (
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex flex-col gap-12">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 4 }}>
              {editVehicle ? 'Edit Vehicle Details' : 'Add New Vehicle'}
            </h3>

            <div style={{ position: 'relative' }}>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Brand <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="input-field" style={selectStyle} value={form.brand}
                onChange={e => handleBrandChange(e.target.value)}>
                <option value="" disabled>Select Brand</option>
                {brandsList.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Model <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="input-field" style={selectStyle} value={form.model} disabled={!form.brand}
                onChange={e => setForm({ ...form, model: e.target.value })}>
                <option value="" disabled>Select Model</option>
                {modelsList.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Number Plate <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. MH 02 AB 1234" value={form.number}
                onChange={e => setForm({ ...form, number: e.target.value.toUpperCase() })} />
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Flat Number <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. 102" value={form.flatNumber}
                onChange={e => setForm({ ...form, flatNumber: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Block / Tower</label>
                <input className="input-field" placeholder="e.g. Tower A" value={form.blockTower}
                  onChange={e => setForm({ ...form, blockTower: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Slot / Pillar Number</label>
                <input className="input-field" placeholder="e.g. Slot 42" value={form.slotPillar}
                  onChange={e => setForm({ ...form, slotPillar: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Color (optional)</label>
              <input className="input-field" placeholder="e.g. White, Black, Silver" value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>

            {editVehicle && editVehicle.photos && editVehicle.photos.length > 0 && imagePreviews.length === 0 && (
              <div style={{ marginTop: 4 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Current Photos</label>
                <div className="flex gap-12 flex-wrap">
                  {editVehicle.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)' }} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>
                {editVehicle ? 'Replace Photos (Optional)' : 'Vehicle Photos (Min 1, Max 5) *'}
              </label>
              
              <div className="flex gap-12 flex-wrap" style={{ marginBottom: 16 }}>
                {imagePreviews.map((preview, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <img src={preview} alt={`Vehicle ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {form.photos.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 12, border: '1px dashed var(--primary-blue)', background: 'rgba(var(--primary-blue-rgb), 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: 'var(--primary-blue)' }}>
                    <Upload size={20} />
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Add</span>
                  </button>
                )}
                <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
            </div>
            <button className="btn btn-blue w-full" onClick={saveVehicle} disabled={submitting || !form.brand || !form.model || !form.number || !form.flatNumber || (!editVehicle && form.photos.length === 0)}>
              {submitting ? 'Saving…' : editVehicle ? 'Update Vehicle' : 'Save Vehicle'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {vehicles.length === 0 && !adding && (
          <div className="text-center text-secondary py-8">No vehicles added yet.</div>
        )}
        {vehicles.map(v => (
          <div key={v._id} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)', flexShrink: 0 }}>
                <Car size={22} style={{ color: 'var(--primary-blue)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{v.brand} {v.model}</div>
                <div className="text-body-sm text-secondary" style={{ lineHeight: 1.5, wordBreak: 'break-word' }}>{v.number} · {v.parking || 'No parking info'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button onClick={() => startEdit(v)} style={{ color: 'var(--text-secondary)', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Pencil size={18} />
                </button>
                <button onClick={() => setConfirmHideId(v._id)} style={{ color: 'var(--text-tertiary)', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                  <EyeOff size={18} />
                </button>
              </div>
            </div>
            {v.photos && v.photos.length > 0 && (
              <div className="flex gap-8 overflow-x-auto" style={{ paddingBottom: 4, marginLeft: 60 }}>
                {v.photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Vehicle ${v.model} - ${i}`} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)', flexShrink: 0 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hide confirmation */}
      {confirmHideId && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 360, padding: '36px 32px', borderRadius: 28,
            border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            textAlign: 'center',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <EyeOff size={22} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Hide Vehicle?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
              This will hide the vehicle from your active garage, but will preserve its booking history.
            </p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmHideId(null)}>Cancel</button>
              <button className="btn w-full btn-primary" style={{ borderRadius: 14 }} onClick={() => hideVehicle(confirmHideId)}>
                Hide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

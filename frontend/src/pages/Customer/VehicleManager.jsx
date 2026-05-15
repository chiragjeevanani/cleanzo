import PageLoader from '../../components/PageLoader'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Car, ChevronDown, X, Upload } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

const VEHICLE_CATEGORIES = [
  { value: 'scooty',    label: 'Scooty' },
  { value: 'bike',      label: 'Bike' },
  { value: 'small_car', label: 'Small Car' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan',     label: 'Sedan' },
  { value: 'mpv',       label: 'MPV' },
  { value: 'suv',       label: 'SUV' },
  { value: 'premium',   label: 'Premium' },
]

const EMPTY_FORM = { brand: '', model: '', number: '', parking: '', category: 'sedan', color: '', photos: [] }

export default function VehicleManager() {
  const { showToast } = useToast()
  const [vehicles, setVehicles] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imagePreviews, setImagePreviews] = useState([])
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => { fetchVehicles() }, [])

  const fetchVehicles = async () => {
    try {
      const res = await apiClient.get('/customer/vehicles')
      setVehicles(res.vehicles || [])
    } catch (err) {
      setError('Failed to load vehicles. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const addVehicle = async () => {
    if (!form.brand || !form.model || !form.number) {
      setError('Brand, model, and plate number are required')
      return
    }
    const plateClean = form.number.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/.test(plateClean) && plateClean.length < 4) {
      setError('Enter a valid vehicle registration number (e.g. MH01AB1234)')
      return
    }
    if (form.photos.length === 0) {
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
      formData.append('parking', form.parking || '')
      formData.append('category', form.category)
      if (form.color) formData.append('color', form.color)
      
      form.photos.forEach(file => {
        formData.append('photos', file)
      })

      // Use uploadForm helper for multipart/form-data
      await apiClient.uploadForm('/customer/vehicles', formData)
      
      setForm(EMPTY_FORM)
      setImagePreviews([])
      setAdding(false)
      fetchVehicles()
      showToast('Vehicle added successfully')
    } catch (err) {
      setError(err.message || 'Failed to add vehicle.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteVehicle = async (id) => {
    try {
      await apiClient.delete(`/customer/vehicles/${id}`)
      setConfirmDeleteId(null)
      fetchVehicles()
      showToast('Vehicle removed')
    } catch (err) {
      setConfirmDeleteId(null)
      setError('Failed to remove vehicle.')
    }
  }

  if (loading) return <PageLoader />

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
        <Link to="/customer" className="flex items-center gap-8"><ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>My Vehicles</span></Link>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}><Plus size={16} /> Add</button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {adding && (
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex flex-col gap-12">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Brand <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. Honda, Maruti, BMW" value={form.brand}
                onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Model <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. City, Swift, X5" value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Number Plate <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. MH 02 AB 1234" value={form.number}
                onChange={e => setForm({ ...form, number: e.target.value.toUpperCase() })} />
            </div>
            <div style={{ position: 'relative' }}>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Vehicle Type <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="input-field" style={selectStyle} value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {VEHICLE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Parking Location</label>
              <input className="input-field" placeholder="e.g. Tower A, Slot 42" value={form.parking}
                onChange={e => setForm({ ...form, parking: e.target.value })} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Color (optional)</label>
              <input className="input-field" placeholder="e.g. White, Black, Silver" value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Vehicle Photos (Min 1, Max 5) <span style={{ color: 'var(--error)' }}>*</span></label>
              
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
            <button className="btn btn-blue w-full" onClick={addVehicle} disabled={submitting || !form.brand || !form.model || !form.number || form.photos.length === 0}>
              {submitting ? 'Saving…' : 'Save Vehicle'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {vehicles.length === 0 && !adding && (
          <div className="text-center text-secondary py-8">No vehicles added yet.</div>
        )}
        {vehicles.map(v => (
          <div key={v._id} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius)', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
              <Car size={22} style={{ color: 'var(--primary-blue)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{v.brand} {v.model}</div>
              <div className="text-body-sm text-secondary">{v.number} · {v.parking || 'No parking info'}</div>
              {v.photos && v.photos.length > 0 && (
                <div className="flex gap-8 mt-12 overflow-x-auto" style={{ paddingBottom: 4 }}>
                  {v.photos.map((photo, i) => (
                    <img key={i} src={photo} alt={`Vehicle ${v.model} - ${i}`} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)' }} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setConfirmDeleteId(v._id)} style={{ color: 'var(--error)', padding: 8 }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{
            width: 360, padding: '36px 32px', borderRadius: 28,
            border: '1px solid rgba(255,50,50,0.2)', boxShadow: 'var(--shadow-lg)',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
            textAlign: 'center',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,50,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="var(--error)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Remove Vehicle?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
              This will permanently remove the vehicle from your garage.
            </p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn w-full" style={{ background: 'var(--error)', color: '#fff', borderRadius: 14 }} onClick={() => deleteVehicle(confirmDeleteId)}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

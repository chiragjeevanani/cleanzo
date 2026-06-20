import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Car, X, Search,
  ImageIcon, Pencil, Trash2, Loader2,
} from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { useCustomerData } from '../../context/CustomerDataContext'

// Searchable text input + filtered dropdown list, used for Brand and Model
// pickers below (replaces a plain <select> so long brand/model lists are
// findable by typing instead of scrolling).
function SearchableSelect({ label, required, placeholder, query, onQueryChange, options, onSelect, disabled, show, setShow, emptyText, confirmedValue }) {
  return (
    <div style={{ position: 'relative' }}>
      <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>
        {label} {required && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} />
        <input
          className="input-field"
          style={{ paddingLeft: 38, paddingRight: 32, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => setShow(true)}
          onChange={e => { onQueryChange(e.target.value); setShow(true) }}
          onBlur={() => setTimeout(() => {
            setShow(false)
            // Revert to the last confirmed selection if the user typed but never picked an option.
            if (query !== confirmedValue) onQueryChange(confirmedValue || '')
          }, 150)}
        />
        {query && !disabled && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onSelect('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {show && !disabled && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 12, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {options.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>{emptyText}</div>
          ) : options.map(opt => (
            <div
              key={opt}
              className="search-option"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onSelect(opt)}
              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14 }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  brand: '', model: '', number: '', flatNumber: '',
  blockTower: '', slotPillar: '', category: 'sedan', color: '', photos: [],
}

// ── Image compression ─────────────────────────────────────────────────────────
const compressImage = (file, maxWidth = 1200, quality = 0.82) =>
  new Promise((resolve) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      try {
        let { width, height } = img
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg', quality
        )
      } catch { resolve(file) }
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
    img.src = blobUrl
  })

export default function VehicleManager() {
  const navigate = useNavigate()
  const { showToast, dismissToast } = useToast()
  const { vehicles, subscriptions, loading: dataLoading, refreshVehicles } = useCustomerData()

  const [adding, setAdding]             = useState(false)
  const [editVehicle, setEditVehicle]   = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [brandsList, setBrandsList]     = useState([])
  const [modelsList, setModelsList]     = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [submitting, setSubmitting]     = useState(false)
  const [compressing, setCompressing]   = useState(false)
  const [error, setError]               = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [brandQuery, setBrandQuery]       = useState('')
  const [modelQuery, setModelQuery]       = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [loadingBrands, setLoadingBrands] = useState(true)

  const galleryInputRef = useRef(null)

  useEffect(() => { fetchBrands() }, [])

  const fetchBrands = async () => {
    try { const res = await apiClient.get('/public/brands'); setBrandsList(res.brands || []) }
    catch (err) { console.error('Failed to load brands:', err) }
    finally { setLoadingBrands(false) }
  }

  // ── Gallery file handler ──────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (!files.length) return

    const allowed = 5 - form.photos.length
    if (allowed <= 0) { setError('You can only upload up to 5 images per vehicle.'); return }

    const toProcess = files.slice(0, allowed)
    if (files.length > allowed) setError(`Only the first ${allowed} image(s) were added (max 5).`)
    else setError('')

    const startIdx = form.photos.length
    const immediateUrls = toProcess.map(f => URL.createObjectURL(f))
    setImagePreviews(prev => [...prev, ...immediateUrls])
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...toProcess] }))

    setCompressing(true)
    const toastId = showToast(
      `🔄 Optimising ${toProcess.length > 1 ? `${toProcess.length} images` : 'image'}…`, 'info', 0
    )
    try {
      const compressed = await Promise.all(toProcess.map(f => compressImage(f)))
      const compressedUrls = compressed.map(f => URL.createObjectURL(f))

      setForm(prev => {
        const photos = [...prev.photos]
        compressed.forEach((cf, i) => { photos[startIdx + i] = cf })
        return { ...prev, photos }
      })
      setImagePreviews(prev => {
        const next = [...prev]
        immediateUrls.forEach((url, i) => { URL.revokeObjectURL(url); next[startIdx + i] = compressedUrls[i] })
        return next
      })
      dismissToast(toastId)
      showToast(`✅ ${toProcess.length > 1 ? `${toProcess.length} photos` : 'Photo'} optimised & ready`, 'success', 2500)
    } catch {
      dismissToast(toastId)
      showToast('✅ Photo added (original quality)', 'success', 2000)
    } finally {
      setCompressing(false)
    }
  }

  const removeImage = (index) => {
    const newPhotos = [...form.photos]; newPhotos.splice(index, 1)
    setForm(prev => ({ ...prev, photos: newPhotos }))
    const newPreviews = [...imagePreviews]
    URL.revokeObjectURL(newPreviews[index]); newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  // ── Form helpers ──────────────────────────────────────────────────────────
  const handleBrandChange = (brandName) => {
    const b = brandsList.find(b => b.name === brandName)
    setForm(prev => ({ ...prev, brand: brandName, model: '' }))
    setModelsList(b ? b.models : [])
    setBrandQuery(brandName); setModelQuery(''); setShowBrandDropdown(false)
  }

  const handleModelChange = (modelName) => {
    setForm(prev => ({ ...prev, model: modelName }))
    setModelQuery(modelName); setShowModelDropdown(false)
  }

  const handleToggleAdd = () => {
    setEditVehicle(null); setForm(EMPTY_FORM); setModelsList([])
    setBrandQuery(''); setModelQuery('')
    setImagePreviews([]); setAdding(!adding); setError('')
  }

  const startEdit = (v) => {
    setEditVehicle(v)
    setForm({ brand: v.brand||'', model: v.model||'', number: v.number||'', flatNumber: v.flatNumber||'',
      blockTower: v.blockTower||'', slotPillar: v.slotPillar||'', category: v.category||'sedan', color: v.color||'', photos: [] })
    const b = brandsList.find(b => b.name === v.brand)
    setModelsList(b ? b.models : [])
    setBrandQuery(v.brand||''); setModelQuery(v.model||'')
    setImagePreviews([]); setAdding(true); setError('')
  }

  const saveVehicle = async () => {
    if (!form.brand || !form.model || !form.number || !form.flatNumber || !form.blockTower || !form.color) {
      setError('Brand, model, plate number, flat number, block/tower, and color are required'); return
    }
    const plateClean = form.number.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(plateClean)) {
      setError('Enter a valid vehicle registration number (e.g. MH01AB1234)'); return
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(form.blockTower.trim())) {
      setError('Block / Tower must be alphanumeric (letters, numbers, spaces, or dashes)'); return
    }
    if (!/^[a-zA-Z\s]+$/.test(form.color.trim())) {
      setError('Color must contain only alphabetic characters'); return
    }
    if (form.color.trim().length < 2) {
      setError('Color must be at least 2 characters'); return
    }
    setSubmitting(true); setError('')
    const uploadingId = showToast(
      `⬆️ Uploading vehicle${form.photos.length ? ` with ${form.photos.length} photo${form.photos.length > 1 ? 's' : ''}` : ''}…`,
      'info', 0
    )
    try {
      const fd = new FormData()
      fd.append('brand', form.brand); fd.append('model', form.model)
      fd.append('number', form.number.toUpperCase()); fd.append('flatNumber', form.flatNumber||'')
      fd.append('blockTower', form.blockTower||''); fd.append('slotPillar', form.slotPillar||'')
      fd.append('category', form.category)
      if (form.color) fd.append('color', form.color)
      form.photos.forEach(f => fd.append('photos', f))

      if (editVehicle) {
        await apiClient.uploadForm(`/customer/vehicles/${editVehicle._id}`, fd, 'PUT')
        dismissToast(uploadingId); showToast('🚗 Vehicle updated!', 'success', 3000)
      } else {
        await apiClient.uploadForm('/customer/vehicles', fd, 'POST')
        dismissToast(uploadingId); showToast('🚗 Vehicle added successfully!', 'success', 3000)
      }
      setForm(EMPTY_FORM); setModelsList([]); setImagePreviews([])
      setAdding(false); setEditVehicle(null); refreshVehicles()
    } catch (err) {
      dismissToast(uploadingId)
      setError(err.message || 'Failed to save vehicle.')
      showToast('❌ Upload failed. Please try again.', 'error', 3500)
    } finally { setSubmitting(false) }
  }

  const deleteVehicle = async (id) => {
    try {
      await apiClient.delete(`/customer/vehicles/${id}`)
      setConfirmDeleteId(null); refreshVehicles(); showToast('Vehicle deleted successfully', 'success')
    } catch (err) {
      setConfirmDeleteId(null);
      showToast(err.message || 'Failed to delete vehicle.', 'error')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const loading = dataLoading.vehicles || loadingBrands
  if (loading && !vehicles.length) return (
    <div className="app-shell">
      <div className="app-header" style={{ padding: '24px var(--margin-side)', background: 'transparent' }}>
        <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 80, height: 40, borderRadius: 16, flexShrink: 0 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        {[1,2,3].map(i => (
          <div key={i} className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24, marginBottom: 12 }}>
            <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: 140, height: 18, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // While a vehicle has an active subscription its identity (brand/model/number) is locked.
  const editLocked = !!editVehicle && (subscriptions || []).some(s => s.vehicle?._id === editVehicle._id && s.status === 'Active')
  const lockedStyle = { opacity: 0.6, cursor: 'not-allowed' }

  const filteredBrands = brandsList.filter(b => b.name.toLowerCase().includes(brandQuery.toLowerCase())).map(b => b.name)
  const filteredModels = modelsList.filter(m => m.toLowerCase().includes(modelQuery.toLowerCase()))

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button
          onClick={() => { if (adding) { setAdding(false); setEditVehicle(null) } else navigate(-1) }}
          className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0"
        >
          <ArrowLeft size={20} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>My Vehicles</span>
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

      {/* Add / Edit form */}
      {adding && (
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex flex-col gap-12">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 4 }}>
              {editVehicle ? 'Edit Vehicle Details' : 'Add New Vehicle'}
            </h3>

            {editLocked && (
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(0,102,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: 13 }}>
                🔒 Car name, model and number are locked while a plan is active. You can still update parking details, colour and photos.
              </div>
            )}

            <SearchableSelect
              label="Brand"
              required
              placeholder="Search brand…"
              query={brandQuery}
              onQueryChange={setBrandQuery}
              options={filteredBrands}
              onSelect={handleBrandChange}
              disabled={editLocked}
              show={showBrandDropdown}
              setShow={setShowBrandDropdown}
              emptyText="No matching brands"
              confirmedValue={form.brand}
            />

            <SearchableSelect
              label="Model"
              required
              placeholder={form.brand ? 'Search model…' : 'Select a brand first'}
              query={modelQuery}
              onQueryChange={setModelQuery}
              options={filteredModels}
              onSelect={handleModelChange}
              disabled={editLocked || !form.brand}
              show={showModelDropdown}
              setShow={setShowModelDropdown}
              emptyText="No matching models"
              confirmedValue={form.model}
            />

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Number Plate <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" style={editLocked ? lockedStyle : undefined} placeholder="e.g. MH 02 AB 1234" value={form.number} disabled={editLocked} onChange={e => setForm({ ...form, number: e.target.value.toUpperCase() })} />
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Flat Number <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. 102" value={form.flatNumber} onChange={e => setForm({ ...form, flatNumber: e.target.value.replace(/[^a-zA-Z0-9\s/-]/g, '') })} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Block / Tower <span style={{ color: 'var(--error)' }}>*</span></label>
                <input className="input-field" placeholder="e.g. Tower A" value={form.blockTower} onChange={e => setForm({ ...form, blockTower: e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '') })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Parking Location</label>
                <input className="input-field" placeholder="e.g. Near Gate 2" value={form.slotPillar} onChange={e => setForm({ ...form, slotPillar: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Color <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. Black, White, Silver" value={form.color} onChange={e => setForm({ ...form, color: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} />
            </div>

            {/* Existing photos (edit mode) */}
            {editVehicle && editVehicle.photos?.length > 0 && imagePreviews.length === 0 && (
              <div>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Current Photos</label>
                <div className="flex gap-12 flex-wrap">
                  {editVehicle.photos.map((p, i) => (
                    <img key={i} src={p} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Photo grid + add button */}
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>
                {editVehicle ? 'Replace Photos (Optional)' : 'Vehicle Photos (Optional, Max 5)'}
              </label>
              <div className="flex gap-12 flex-wrap">
                {imagePreviews.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)', flexShrink: 0 }}>
                    <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', display: 'flex', color: '#fff' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {form.photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={compressing}
                    style={{ width: 80, height: 80, borderRadius: 12, border: '1.5px dashed var(--primary-blue)', background: 'rgba(0,102,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: compressing ? 'default' : 'pointer', color: 'var(--primary-blue)', flexShrink: 0 }}
                  >
                    {compressing ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{compressing ? 'Processing' : 'Add'}</span>
                  </button>
                )}
              </div>

              <input type="file" accept="image/*" multiple ref={galleryInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <button
              className="btn btn-blue w-full"
              onClick={saveVehicle}
              disabled={submitting || compressing || !form.brand || !form.model || !form.number || !form.flatNumber || !form.blockTower || !form.color}
            >
              {submitting ? 'Saving…' : editVehicle ? 'Update Vehicle' : 'Save Vehicle'}
            </button>
          </div>
        </div>
      )}

      {/* Vehicle list */}
      <div className="flex flex-col gap-8" style={{ paddingBottom: 100 }}>
        {vehicles.length === 0 && !adding && (
          <div className="text-center text-secondary py-8">No vehicles added yet.</div>
        )}
        {vehicles.map(v => {
          const hasActiveSub = (subscriptions || []).some(s => s.vehicle?._id === v._id && s.status === 'Active');
          return (
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
                  <button onClick={() => startEdit(v)} style={{ color: 'var(--text-secondary)', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={18} /></button>
                  <button 
                    onClick={() => {
                      if (hasActiveSub) {
                        showToast('Cannot delete a vehicle with an active subscription', 'error')
                      } else {
                        setConfirmDeleteId(v._id)
                      }
                    }} 
                    style={{ 
                      color: hasActiveSub ? 'var(--text-tertiary)' : '#ff453a', 
                      opacity: hasActiveSub ? 0.35 : 1,
                      padding: 8, 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer' 
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {v.photos?.length > 0 && (
                <div className="flex gap-8 overflow-x-auto" style={{ paddingBottom: 4, marginLeft: 60 }}>
                  {v.photos.map((p, i) => (
                    <img key={i} src={p} alt={`${v.model} ${i}`} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)', flexShrink: 0 }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{ width: 360, padding: '36px 32px', borderRadius: 28, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'var(--shadow-lg)', background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,50,50,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="var(--error)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Delete Vehicle?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn w-full btn-primary" style={{ borderRadius: 14, backgroundColor: 'var(--error)', color: '#fff' }} onClick={() => deleteVehicle(confirmDeleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

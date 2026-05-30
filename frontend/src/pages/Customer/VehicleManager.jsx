import Skeleton from '../../components/Skeleton'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Car, ChevronDown, X, Camera, ImageIcon, Pencil, EyeOff, Loader2 } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { useCustomerData } from '../../context/CustomerDataContext'

const EMPTY_FORM = { brand: '', model: '', number: '', flatNumber: '', blockTower: '', slotPillar: '', category: 'sedan', color: '', photos: [] }

// ── Image compression via Canvas API ─────────────────────────────────────────
// Resizes to max 1200px and re-encodes as JPEG at 80% quality.
// Falls back to the original file on any failure (null blob, load error, etc.)
const compressImage = (file, maxWidth = 1200, quality = 0.8) =>
  new Promise((resolve) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      try {
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            // blob is null on memory-constrained mobile — fall back to original
            if (!blob) { resolve(file); return }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality
        )
      } catch {
        resolve(file) // canvas failed — use original
      }
    }

    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
    img.src = blobUrl
  })

export default function VehicleManager() {
  const navigate = useNavigate()
  const { showToast, dismissToast } = useToast()
  const { vehicles, loading: dataLoading, refreshVehicles } = useCustomerData()

  const [adding, setAdding]             = useState(false)
  const [editVehicle, setEditVehicle]   = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [brandsList, setBrandsList]     = useState([])
  const [modelsList, setModelsList]     = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [submitting, setSubmitting]     = useState(false)
  const [compressing, setCompressing]   = useState(false)
  const [error, setError]               = useState('')
  const [confirmHideId, setConfirmHideId] = useState(null)
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)

  // Two separate inputs: direct camera vs gallery/file-picker
  const cameraInputRef  = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => { fetchBrands() }, [])

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
    setForm({ brand: v.brand || '', model: v.model || '', number: v.number || '', flatNumber: v.flatNumber || '', blockTower: v.blockTower || '', slotPillar: v.slotPillar || '', category: v.category || 'sedan', color: v.color || '', photos: [] })
    const selectedBrand = brandsList.find(b => b.name === v.brand)
    setModelsList(selectedBrand ? selectedBrand.models : [])
    setImagePreviews([])
    setAdding(true)
    setError('')
  }

  // ── Handle file selection from either input ───────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    // Reset immediately so the same file/photo can be re-selected if needed
    e.target.value = ''
    if (!files.length) return

    const currentCount = form.photos.length
    const allowed = 5 - currentCount
    if (allowed <= 0) {
      setError('You can only upload up to 5 images per vehicle.')
      return
    }

    const toProcess = files.slice(0, allowed)
    if (files.length > allowed) setError(`Only the first ${allowed} image(s) were added (max 5).`)
    else setError('')

    // ── Phase 1: show preview IMMEDIATELY from original file ─────────────────
    // The user sees the image the instant it's picked — no waiting for Canvas.
    const startIdx = currentCount // position where these photos will sit in the array
    const immediateUrls = toProcess.map(f => URL.createObjectURL(f))
    setImagePreviews(prev => [...prev, ...immediateUrls])
    setForm(prev => ({ ...prev, photos: [...prev.photos, ...toProcess] }))

    // ── Phase 2: compress in background, silently swap ────────────────────────
    setCompressing(true)
    const optimisingId = showToast(
      `🔄 Optimising ${toProcess.length > 1 ? `${toProcess.length} images` : 'image'}…`,
      'info',
      0
    )

    try {
      const compressed = await Promise.all(toProcess.map(f => compressImage(f)))

      // Replace the original files with compressed versions in form state
      setForm(prev => {
        const photos = [...prev.photos]
        compressed.forEach((cf, i) => { photos[startIdx + i] = cf })
        return { ...prev, photos }
      })

      // Swap preview URLs (revoke old blobs to free memory)
      const compressedUrls = compressed.map(f => URL.createObjectURL(f))
      setImagePreviews(prev => {
        const next = [...prev]
        immediateUrls.forEach((url, i) => {
          URL.revokeObjectURL(url)
          next[startIdx + i] = compressedUrls[i]
        })
        return next
      })

      dismissToast(optimisingId)
      showToast(
        `✅ ${toProcess.length > 1 ? `${toProcess.length} photos` : 'Photo'} optimised & ready`,
        'success',
        2500
      )
    } catch {
      // Compression failed — keep the original files already in state
      dismissToast(optimisingId)
      showToast('✅ Photo added (original quality)', 'success', 2000)
    } finally {
      setCompressing(false)
    }
  }

  const removeImage = (index) => {
    const newPhotos = [...form.photos]
    newPhotos.splice(index, 1)
    setForm(prev => ({ ...prev, photos: newPhotos }))
    const newPreviews = [...imagePreviews]
    URL.revokeObjectURL(newPreviews[index])
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
  }

  const saveVehicle = async () => {
    if (!form.brand || !form.model || !form.number || !form.flatNumber) {
      setError('Brand, model, plate number, and flat number are required')
      return
    }
    const plateClean = form.number.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/.test(plateClean)) {
      setError('Enter a valid vehicle registration number (e.g. MH01AB1234)')
      return
    }
    if (!editVehicle && form.photos.length === 0) {
      setError('Please upload at least 1 photo of the vehicle')
      return
    }

    setSubmitting(true)
    setError('')

    // Show persistent "Uploading" toast — stays until dismissed
    const uploadingId = showToast(
      `⬆️ Uploading vehicle${form.photos.length ? ` with ${form.photos.length} photo${form.photos.length > 1 ? 's' : ''}` : ''}…`,
      'info',
      0
    )

    try {
      const fd = new FormData()
      fd.append('brand', form.brand)
      fd.append('model', form.model)
      fd.append('number', form.number.toUpperCase())
      fd.append('flatNumber', form.flatNumber || '')
      fd.append('blockTower', form.blockTower || '')
      fd.append('slotPillar', form.slotPillar || '')
      fd.append('category', form.category)
      if (form.color) fd.append('color', form.color)
      form.photos.forEach(file => fd.append('photos', file))

      if (editVehicle) {
        await apiClient.uploadForm(`/customer/vehicles/${editVehicle._id}`, fd, 'PUT')
        dismissToast(uploadingId)
        showToast('🚗 Vehicle updated successfully!', 'success', 3000)
      } else {
        await apiClient.uploadForm('/customer/vehicles', fd, 'POST')
        dismissToast(uploadingId)
        showToast('🚗 Vehicle added successfully!', 'success', 3000)
      }

      setForm(EMPTY_FORM)
      setModelsList([])
      setImagePreviews([])
      setAdding(false)
      setEditVehicle(null)
      refreshVehicles()
    } catch (err) {
      dismissToast(uploadingId)
      setError(err.message || 'Failed to save vehicle.')
      showToast('❌ Upload failed. Please try again.', 'error', 3500)
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
        <div className="skeleton" style={{ width: 120, height: 28, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 80, height: 40, borderRadius: 16, flexShrink: 0 }} />
      </div>
      <div className="container" style={{ padding: '0 20px' }}>
        <div className="flex flex-col gap-16 mt-12">
          {[1,2,3].map(i => (
            <div key={i} className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 24 }}>
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: 140, height: 18, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const selectStyle = { width: '100%', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', paddingRight: 36 }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="app-header" style={{ padding: '16px 0' }}>
        <button
          onClick={() => { if (adding) { setAdding(false); setEditVehicle(null) } else { navigate(-1) } }}
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

      {adding && (
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex flex-col gap-12">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 4 }}>
              {editVehicle ? 'Edit Vehicle Details' : 'Add New Vehicle'}
            </h3>

            <div style={{ position: 'relative' }}>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Brand <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="input-field" style={selectStyle} value={form.brand} onChange={e => handleBrandChange(e.target.value)}>
                <option value="" disabled>Select Brand</option>
                {brandsList.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
            </div>

            <div style={{ position: 'relative' }}>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Model <span style={{ color: 'var(--error)' }}>*</span></label>
              <select className="input-field" style={selectStyle} value={form.model} disabled={!form.brand} onChange={e => setForm({ ...form, model: e.target.value })}>
                <option value="" disabled>Select Model</option>
                {modelsList.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 14, bottom: 14, opacity: 0.4, pointerEvents: 'none' }} />
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Number Plate <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. MH 02 AB 1234" value={form.number} onChange={e => setForm({ ...form, number: e.target.value.toUpperCase() })} />
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Flat Number <span style={{ color: 'var(--error)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. 102" value={form.flatNumber} onChange={e => setForm({ ...form, flatNumber: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Block / Tower</label>
                <input className="input-field" placeholder="e.g. Tower A" value={form.blockTower} onChange={e => setForm({ ...form, blockTower: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Slot / Pillar Number</label>
                <input className="input-field" placeholder="e.g. Slot 42" value={form.slotPillar} onChange={e => setForm({ ...form, slotPillar: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Color (optional)</label>
              <input className="input-field" placeholder="e.g. White, Black, Silver" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>

            {/* Existing photos when editing */}
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

            {/* ── Photo upload section ──────────────────────────────────────── */}
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>
                {editVehicle ? 'Replace Photos (Optional)' : 'Vehicle Photos (Min 1, Max 5) *'}
              </label>

              <div className="flex gap-12 flex-wrap" style={{ marginBottom: 4 }}>
                {imagePreviews.map((preview, i) => (
                  <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                    <img src={preview} alt={`Vehicle ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Add button — opens custom picker sheet */}
                {form.photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setShowPhotoPicker(true)}
                    disabled={compressing}
                    style={{ width: 80, height: 80, borderRadius: 12, border: '1.5px dashed var(--primary-blue)', background: 'rgba(0,102,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: compressing ? 'default' : 'pointer', color: 'var(--primary-blue)', flexShrink: 0 }}
                  >
                    {compressing
                      ? <Loader2 size={20} className="animate-spin" />
                      : <Camera size={20} />}
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{compressing ? 'Processing' : 'Add'}</span>
                  </button>
                )}
              </div>

              {/* Hidden camera input — capture="environment" opens rear camera directly,
                  bypassing the Android share-sheet so onChange fires reliably */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Hidden gallery input — standard multi-select from gallery */}
              <input
                type="file"
                accept="image/*"
                multiple
                ref={galleryInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            <button
              className="btn btn-blue w-full"
              onClick={saveVehicle}
              disabled={submitting || compressing || !form.brand || !form.model || !form.number || !form.flatNumber || (!editVehicle && form.photos.length === 0)}
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
                  <img key={i} src={photo} alt={`${v.model} ${i}`} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-glass)', flexShrink: 0 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Custom photo picker bottom sheet ──────────────────────────────────
          Replaces Android's "Share via Nearby Share / Camera / Media picker"
          sheet with a clean in-app UI that routes to the correct input.      */}
      {showPhotoPicker && (
        <div
          onClick={() => setShowPhotoPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: '24px 24px 0 0', padding: '12px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />

            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 16 }}>
              Add Vehicle Photo
            </p>

            {/* Camera option */}
            <button
              onClick={() => { setShowPhotoPicker(false); setTimeout(() => cameraInputRef.current?.click(), 300) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,122,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={22} style={{ color: '#007AFF' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Camera</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Take a photo right now</div>
              </div>
            </button>

            {/* Gallery option */}
            <button
              onClick={() => { setShowPhotoPicker(false); setTimeout(() => galleryInputRef.current?.click(), 300) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ImageIcon size={22} style={{ color: '#34C759' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Gallery</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Choose from your photos</div>
              </div>
            </button>

            <button
              onClick={() => setShowPhotoPicker(false)}
              style={{ width: '100%', marginTop: 12, padding: '14px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hide confirmation modal */}
      {confirmHideId && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="glass animate-scale-in" style={{ width: 360, padding: '36px 32px', borderRadius: 28, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'var(--shadow-lg)', background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <EyeOff size={22} color="var(--text-secondary)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Hide Vehicle?</h2>
            <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
              This will hide the vehicle from your active garage, but will preserve its booking history.
            </p>
            <div className="flex gap-12">
              <button className="btn btn-glass w-full" onClick={() => setConfirmHideId(null)}>Cancel</button>
              <button className="btn w-full btn-primary" style={{ borderRadius: 14 }} onClick={() => hideVehicle(confirmHideId)}>Hide</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

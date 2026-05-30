import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Car, ChevronDown, X, Camera,
  ImageIcon, Pencil, Trash2, Loader2, FlipHorizontal,
} from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'
import { useCustomerData } from '../../context/CustomerDataContext'

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
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)

  // ── In-app camera state ────────────────────────────────────────────────────
  const [showCamera, setShowCamera]     = useState(false)
  const [cameraReady, setCameraReady]   = useState(false)
  const [capturing, setCapturing]       = useState(false)
  const [facingMode, setFacingMode]     = useState('environment')
  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  const galleryInputRef = useRef(null)

  useEffect(() => { fetchBrands() }, [])

  const fetchBrands = async () => {
    try { const res = await apiClient.get('/public/brands'); setBrandsList(res.brands || []) }
    catch (err) { console.error('Failed to load brands:', err) }
    finally { setLoadingBrands(false) }
  }

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startStream = useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    streamRef.current = stream
    if (videoRef.current) { videoRef.current.srcObject = stream }
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  const openCamera = async () => {
    setShowPhotoPicker(false)
    if (!navigator.mediaDevices?.getUserMedia) {
      // Browser doesn't support getUserMedia — fall back to file input
      setTimeout(() => galleryInputRef.current?.click(), 300)
      showToast('ℹ️ Using system camera as fallback', 'info', 2500)
      return
    }
    setShowCamera(true)
    setCameraReady(false)
    try {
      await startStream(facingMode)
    } catch (err) {
      stopStream()
      setShowCamera(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showToast('📷 Camera access denied. Enable it in your browser settings.', 'error', 4000)
      } else {
        showToast('📷 Could not open camera', 'error', 3000)
      }
    }
  }

  const closeCamera = () => { stopStream(); setShowCamera(false); setCameraReady(false) }

  const flipCamera = async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    setCameraReady(false)
    try { await startStream(next) } catch { showToast('Could not switch camera', 'error', 2000) }
  }

  // Capture frame from video → compress → add to form
  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video || !cameraReady) return
    setCapturing(true)

    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) { setCapturing(false); showToast('Failed to capture photo', 'error', 3000); return }

      closeCamera()

      const rawFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      const startIdx = form.photos.length

      // Immediate preview from raw capture
      const rawUrl = URL.createObjectURL(rawFile)
      setImagePreviews(prev => [...prev, rawUrl])
      setForm(prev => ({ ...prev, photos: [...prev.photos, rawFile] }))
      setCapturing(false)

      // Compress in background
      setCompressing(true)
      const toastId = showToast('🔄 Optimising captured photo…', 'info', 0)
      try {
        const compressed = await compressImage(rawFile)
        const compressedUrl = URL.createObjectURL(compressed)

        setForm(prev => {
          const photos = [...prev.photos]
          photos[startIdx] = compressed
          return { ...prev, photos }
        })
        setImagePreviews(prev => {
          const next = [...prev]
          URL.revokeObjectURL(rawUrl)
          next[startIdx] = compressedUrl
          return next
        })
        dismissToast(toastId)
        showToast('✅ Photo optimised & ready', 'success', 2500)
      } catch {
        dismissToast(toastId)
        showToast('✅ Photo captured', 'success', 2000)
      } finally {
        setCompressing(false)
      }
    }, 'image/jpeg', 0.95)
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
  }

  const handleToggleAdd = () => {
    setEditVehicle(null); setForm(EMPTY_FORM); setModelsList([])
    setImagePreviews([]); setAdding(!adding); setError('')
  }

  const startEdit = (v) => {
    setEditVehicle(v)
    setForm({ brand: v.brand||'', model: v.model||'', number: v.number||'', flatNumber: v.flatNumber||'',
      blockTower: v.blockTower||'', slotPillar: v.slotPillar||'', category: v.category||'sedan', color: v.color||'', photos: [] })
    const b = brandsList.find(b => b.name === v.brand)
    setModelsList(b ? b.models : [])
    setImagePreviews([]); setAdding(true); setError('')
  }

  const saveVehicle = async () => {
    if (!form.brand || !form.model || !form.number || !form.flatNumber) {
      setError('Brand, model, plate number, and flat number are required'); return
    }
    const plateClean = form.number.replace(/\s/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/.test(plateClean)) {
      setError('Enter a valid vehicle registration number (e.g. MH01AB1234)'); return
    }
    if (!editVehicle && form.photos.length === 0) {
      setError('Please upload at least 1 photo of the vehicle'); return
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

  const selectStyle = { width: '100%', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', paddingRight: 36 }

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
                {modelsList.map((m, i) => <option key={i} value={m}>{m}</option>)}
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
                <input className="input-field" placeholder="Tower A" value={form.blockTower} onChange={e => setForm({ ...form, blockTower: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Slot / Pillar</label>
                <input className="input-field" placeholder="Slot 42" value={form.slotPillar} onChange={e => setForm({ ...form, slotPillar: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Color (optional)</label>
              <input className="input-field" placeholder="e.g. Black, White, Silver" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
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
                {editVehicle ? 'Replace Photos (Optional)' : 'Vehicle Photos (Min 1, Max 5) *'}
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
                    onClick={() => setShowPhotoPicker(true)}
                    disabled={compressing}
                    style={{ width: 80, height: 80, borderRadius: 12, border: '1.5px dashed var(--primary-blue)', background: 'rgba(0,102,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: compressing ? 'default' : 'pointer', color: 'var(--primary-blue)', flexShrink: 0 }}
                  >
                    {compressing ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{compressing ? 'Processing' : 'Add'}</span>
                  </button>
                )}
              </div>

              {/* Gallery-only hidden input (camera uses getUserMedia now) */}
              <input type="file" accept="image/*" multiple ref={galleryInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
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

      {/* ── Photo source picker sheet ──────────────────────────────────────── */}
      {showPhotoPicker && (
        <div onClick={() => setShowPhotoPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg-elevated)', borderRadius: '24px 24px 0 0', padding: '12px 24px 48px', boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 24px' }} />
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 16 }}>Add Vehicle Photo</p>

            <button
              onClick={openCamera}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(0,122,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={24} style={{ color: '#007AFF' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Camera</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Live viewfinder — capture right now</div>
              </div>
            </button>

            <button
              onClick={() => { setShowPhotoPicker(false); setTimeout(() => galleryInputRef.current?.click(), 300) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ImageIcon size={24} style={{ color: '#34C759' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Gallery</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Choose from your saved photos</div>
              </div>
            </button>

            <button onClick={() => setShowPhotoPicker(false)} style={{ width: '100%', marginTop: 16, padding: '14px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Full-screen in-app camera overlay ──────────────────────────────── */}
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
          {/* Live video feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setCameraReady(true)}
            style={{ flex: 1, width: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* Loading indicator while stream initialises */}
          {!cameraReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <Loader2 size={36} color="#fff" className="animate-spin" />
            </div>
          )}

          {/* Top bar — close */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '52px 24px 16px', display: 'flex', justifyContent: 'flex-end', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
            <button onClick={closeCamera} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={20} />
            </button>
          </div>

          {/* Bottom bar — flip + capture */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 32px 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
            {/* Flip camera */}
            <button onClick={flipCamera} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <FlipHorizontal size={22} />
            </button>

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              disabled={!cameraReady || capturing}
              style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', background: 'transparent', border: 'none', cursor: cameraReady && !capturing ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              {/* Outer ring */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.6)' }} />
              {/* Inner fill */}
              <div style={{ width: 62, height: 62, borderRadius: '50%', background: capturing ? 'rgba(255,255,255,0.5)' : '#fff', transition: 'transform 120ms ease, background 120ms ease', transform: capturing ? 'scale(0.88)' : 'scale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {capturing && <Loader2 size={22} style={{ color: '#000' }} className="animate-spin" />}
              </div>
            </button>

            {/* Spacer to balance the flip button */}
            <div style={{ width: 48 }} />
          </div>
        </div>
      )}

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

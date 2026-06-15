import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, CheckCircle2, AlertCircle, X, RotateCcw, Shield, CreditCard, FileText, MapPin } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useAuth } from '../../context/AuthContext'
import { optimizeImage } from '../../utils/imageOptimizer'

// ─── Step definitions ────────────────────────────
const STEPS = [
  {
    id: 'live_photo',
    title: 'Live Photo',
    subtitle: 'Take a clear selfie. This will also be your profile picture.',
    icon: Camera,
    color: '#65C737',
    cameraOnly: true,
  },
  {
    id: 'aadhaar',
    title: 'Aadhaar Card',
    subtitle: 'Upload a clear photo of your Aadhaar card (front side).',
    icon: CreditCard,
    color: '#4A9EFF',
    cameraOnly: false,
  },
  {
    id: 'pan',
    title: 'PAN Card',
    subtitle: 'Upload a clear photo of your PAN card.',
    icon: FileText,
    color: '#A855F7',
    cameraOnly: false,
  },
]

// ─── Document Upload Component ────────────────────
function DocUpload({ step, preview, onFile, onRemove }) {
  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {preview ? (
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--bg-accent)' }}>
          <img src={preview} alt="Document preview" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
          <button 
            type="button" 
            onClick={onRemove} 
            style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            style={{ flex: 1, height: 120, borderRadius: 16, border: '2px dashed var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <Camera size={24} className="text-secondary" />
            <span style={{ fontSize: 13 }}>Take Photo</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, height: 120, borderRadius: 16, border: '2px dashed var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <Upload size={24} className="text-secondary" />
            <span style={{ fontSize: 13 }}>Upload Image</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            onFile(e.target.files[0])
          }
        }}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={e => {
          if (e.target.files && e.target.files[0]) {
            onFile(e.target.files[0])
          }
        }}
        style={{ display: 'none' }}
      />
    </div>
  )
}

// ─── Main KYC Page ────────────────────────────────
export default function CleanerKYC() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [files, setFiles] = useState({ live_photo: null, aadhaar: null, pan: null })
  const [previews, setPreviews] = useState({ live_photo: null, aadhaar: null, pan: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // Working city — drives which societies the cleaner can be assigned to.
  const [cities, setCities] = useState([])
  const [city, setCity] = useState(user?.city || '')
  const [currentAddress, setCurrentAddress] = useState(user?.currentAddress || '')

  useEffect(() => {
    apiClient.get('/public/cities')
      .then(res => setCities(res.cities || []))
      .catch(() => {})
  }, [])

  const step = STEPS[currentStep]
  const allDone = Object.values(files).every(Boolean) && !!city

  const handleFile = async (file) => {
    if (!file) return
    const id = step.id
    try {
      const optimized = await optimizeImage(file, { maxWidth: 1000, quality: 0.7 })
      setFiles(prev => ({ ...prev, [id]: optimized }))
      setPreviews(prev => ({ ...prev, [id]: URL.createObjectURL(optimized) }))
    } catch (e) {
      console.error('File optimization failed', e)
      setFiles(prev => ({ ...prev, [id]: file }))
      setPreviews(prev => ({ ...prev, [id]: URL.createObjectURL(file) }))
    }
  }

  const removeFile = (id) => {
    setFiles(prev => ({ ...prev, [id]: null }))
    setPreviews(prev => ({ ...prev, [id]: null }))
  }

  const handleSubmit = async () => {
    if (!city) { setError('Please select your city before submitting.'); return }
    if (!Object.values(files).every(Boolean)) { setError('Please complete all 3 document steps before submitting.'); return }
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('live_photo', files.live_photo)
      fd.append('aadhaar', files.aadhaar)
      fd.append('pan', files.pan)
      fd.append('city', city)
      if (currentAddress) fd.append('currentAddress', currentAddress)

      const res = await apiClient.uploadForm('/cleaner/kyc', fd)
      updateUser({ kycStatus: res.kycStatus, avatar: res.avatar, city })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success Screen ──
  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24, flexDirection: 'column', gap: 24, textAlign: 'center' }}>
      {previews.live_photo && (
        <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--bg-accent)' }}>
          <img src={previews.live_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(101,199,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle2 size={36} color="#65C737" />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>KYC Submitted!</h2>
      <p className="text-secondary" style={{ maxWidth: 320, lineHeight: 1.6 }}>
        Our operations team will verify your documents and activate your account within <strong>24 hours</strong>.
      </p>
      <button onClick={() => navigate(-1)} className="btn-primary" style={{ padding: '14px 32px', borderRadius: 14, fontSize: 16 }}>
        Go to Dashboard
      </button>
    </div>
  )

  return (

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0 0 40px' }}>
        {/* Header */}
        <header style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(101,199,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color="#65C737" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, margin: 0 }}>Identity Verification</h1>
            <p className="text-secondary" style={{ fontSize: 12, margin: 0 }}>Required to activate your crew account</p>
          </div>
        </header>

        {/* Progress bar */}
        <div style={{ padding: '0 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 4, background: files[s.id] ? '#65C737' : i === currentStep ? 'rgba(101,199,55,0.4)' : 'var(--border-glass)', transition: 'background 0.4s' }} />
            ))}
          </div>
          <p className="text-secondary" style={{ fontSize: 12, marginTop: 8 }}>Step {currentStep + 1} of {STEPS.length}</p>

          {user?.kycStatus === 'rejected' && user?.kycRejectionNote && (
            <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 20, background: 'rgba(255, 69, 58, 0.08)', border: '1px solid rgba(255, 69, 58, 0.2)', display: 'flex', gap: 14 }}>
              <AlertCircle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, color: 'var(--error)', letterSpacing: '0.05em', marginBottom: 4 }}>KYC REJECTED</h4>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{user?.kycRejectionNote}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Please review the documents and resubmit correctly.</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px' }}>
          {/* Step tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {STEPS.map((s, i) => {
              const done = !!files[s.id]
              return (
                <button key={s.id} onClick={() => setCurrentStep(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', borderRadius: 16, border: `2px solid ${i === currentStep ? s.color : done ? 'rgba(101,199,55,0.4)' : 'var(--border-glass)'}`, background: i === currentStep ? `rgba(${s.color === '#65C737' ? '101,199,55' : s.color === '#4A9EFF' ? '74,158,255' : '168,85,247'},0.08)` : 'transparent', minWidth: 90, cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? '#65C737' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {done ? <CheckCircle2 size={18} color="#000" /> : <s.icon size={16} color={i === currentStep ? s.color : 'var(--text-secondary)'} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: i === currentStep ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{s.title}</span>
                </button>
              )
            })}
          </div>

          {/* Working location card — city drives society assignment */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border-glass)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(74,158,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={24} color="#4A9EFF" />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0 }}>Your Working City</h2>
                <p className="text-secondary" style={{ fontSize: 13, margin: 0 }}>You'll only be assigned to societies in this city.</p>
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>CITY *</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 15, marginBottom: 16, cursor: 'pointer' }}
            >
              <option value="">Select your city…</option>
              {cities.map(c => (
                <option key={c._id || c.name} value={c.name}>{c.name}</option>
              ))}
            </select>

            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>CURRENT ADDRESS</label>
            <textarea
              value={currentAddress}
              onChange={e => setCurrentAddress(e.target.value)}
              rows={2}
              placeholder="House / street / area where you currently live"
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 15, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Step card */}
          <div className="glass" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--border-glass)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(${step.color === '#65C737' ? '101,199,55' : step.color === '#4A9EFF' ? '74,158,255' : '168,85,247'},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <step.icon size={24} color={step.color} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: 0 }}>{step.title}</h2>
                <p className="text-secondary" style={{ fontSize: 13, margin: 0 }}>{step.subtitle}</p>
              </div>
            </div>

            <DocUpload
              step={step}
              preview={previews[step.id]}
              onFile={handleFile}
              onRemove={() => removeFile(step.id)}
            />
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {currentStep > 0 && (
              <button onClick={() => setCurrentStep(s => s - 1)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                ← Back
              </button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={() => { if (!files[step.id]) { setError(`Please capture/upload ${step.title} first.`); return } setError(''); setCurrentStep(s => s + 1) }}
                className="btn-primary"
                style={{ flex: 2, padding: '14px', borderRadius: 14, fontSize: 15 }}>
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !allDone}
                className="btn-primary"
                style={{ flex: 2, padding: '14px', borderRadius: 14, fontSize: 15, opacity: (loading || !allDone) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? (
                  <><div style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Uploading…</>
                ) : (
                  <><Shield size={18} /> Submit KYC</>
                )}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Overview chips */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Required Documents</p>
            {STEPS.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: `1px solid ${files[s.id] ? 'rgba(101,199,55,0.3)' : 'var(--border-glass)'}`, background: files[s.id] ? 'rgba(101,199,55,0.05)' : 'transparent' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: files[s.id] ? 'rgba(101,199,55,0.15)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {files[s.id] ? <CheckCircle2 size={18} color="#65C737" /> : <s.icon size={16} color="var(--text-secondary)" />}
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: files[s.id] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: files[s.id] ? '#65C737' : 'var(--text-muted)' }}>{files[s.id] ? '✓ Done' : 'Pending'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
  )
}

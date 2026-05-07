import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, CheckCircle2, AlertCircle, X, RotateCcw, Shield, User, CreditCard, FileText } from 'lucide-react'
import apiClient from '../../services/apiClient'

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

// ─── Camera Capture Component ─────────────────────
function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState('')

  const startCamera = useCallback(async (facing = 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const flipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    setReady(false)
    await startCamera(next)
  }

  const capture = () => {
    if (!canvasRef.current || !videoRef.current) return
    setFlash(true)
    setTimeout(() => setFlash(false), 300)
    const canvas = canvasRef.current
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'live_photo.jpg', { type: 'image/jpeg' })
        onCapture(file, canvas.toDataURL('image/jpeg', 0.9))
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Flash effect */}
      {flash && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10, pointerEvents: 'none' }} />}

      {/* Close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
        <X size={22} />
      </button>

      {error ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <AlertCircle size={48} color="#ff5555" />
          <p style={{ color: '#fff', textAlign: 'center', fontSize: 15 }}>{error}</p>
          <button onClick={() => startCamera(facingMode)} style={{ padding: '12px 24px', borderRadius: 12, background: '#65C737', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Face guide overlay */}
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* Oval face guide */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
            }}>
              <div style={{
                width: '60%', maxWidth: 220, aspectRatio: '3/4', borderRadius: '50%',
                border: `3px solid ${ready ? '#65C737' : 'rgba(255,255,255,0.4)'}`,
                boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`,
                transition: 'border-color 0.4s',
              }} />
            </div>
            {!ready && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #65C737', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ background: '#111', padding: '24px 32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={flipCamera} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RotateCcw size={20} />
            </button>

            <button
              onClick={capture}
              disabled={!ready}
              style={{ width: 72, height: 72, borderRadius: '50%', background: ready ? '#65C737' : '#333', border: '4px solid rgba(255,255,255,0.3)', cursor: ready ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: ready ? 'scale(1)' : 'scale(0.9)' }}>
              <Camera size={28} color={ready ? '#000' : '#666'} />
            </button>

            <div style={{ width: 48 }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 12, paddingBottom: 8 }}>Position your face inside the oval</p>
        </>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

// ─── Document Upload Component ────────────────────
function DocUpload({ step, preview, onFile, onCamera }) {
  const fileRef = useRef(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {preview ? (
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--accent-lime)' }}>
          <img src={preview} alt="Document preview" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(101,199,55,0.9)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} color="#000" />
          </div>
        </div>
      ) : (
        <div style={{ height: 180, borderRadius: 20, border: '2px dashed var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)' }}>
          <step.icon size={40} strokeWidth={1.5} color={step.color} />
          <p style={{ fontSize: 13, textAlign: 'center', maxWidth: '70%' }}>No document uploaded yet</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onCamera} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          <Camera size={18} />
          Camera
        </button>
        <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          <Upload size={18} />
          Gallery
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
      </div>
    </div>
  )
}

// ─── Main KYC Page ────────────────────────────────
export default function CleanerKYC() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [files, setFiles] = useState({ live_photo: null, aadhaar: null, pan: null })
  const [previews, setPreviews] = useState({ live_photo: null, aadhaar: null, pan: null })
  const [showCamera, setShowCamera] = useState(false)
  const [cameraTarget, setCameraTarget] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const step = STEPS[currentStep]
  const allDone = Object.values(files).every(Boolean)

  const handleCapture = (file, dataUrl) => {
    const id = cameraTarget
    setFiles(prev => ({ ...prev, [id]: file }))
    setPreviews(prev => ({ ...prev, [id]: dataUrl }))
    setShowCamera(false)
  }

  const handleFile = (file) => {
    if (!file) return
    const id = step.id
    setFiles(prev => ({ ...prev, [id]: file }))
    const reader = new FileReader()
    reader.onload = e => setPreviews(prev => ({ ...prev, [id]: e.target.result }))
    reader.readAsDataURL(file)
  }

  const openCamera = (id) => {
    setCameraTarget(id)
    setShowCamera(true)
  }

  const handleSubmit = async () => {
    if (!allDone) { setError('Please complete all 3 steps before submitting.'); return }
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('live_photo', files.live_photo)
      fd.append('aadhaar', files.aadhaar)
      fd.append('pan', files.pan)

      await apiClient.uploadForm('/cleaner/kyc', fd)
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
        <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-lime)' }}>
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
      <button onClick={() => window.location.href = '/cleaner'} className="btn-primary" style={{ padding: '14px 32px', borderRadius: 14, fontSize: 16 }}>
        Go to Dashboard
      </button>
    </div>
  )

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

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

            {step.cameraOnly ? (
              /* Live photo — camera only */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {previews.live_photo ? (
                  <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '3px solid var(--accent-lime)' }}>
                    <img src={previews.live_photo} alt="Live photo" style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(101,199,55,0.9)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={22} color="#000" />
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '20px 16px 16px' }}>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>✓ Profile photo captured</p>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => openCamera('live_photo')} style={{ height: 220, borderRadius: 20, border: '2px dashed #65C737', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(101,199,55,0.04)', cursor: 'pointer' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(101,199,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={32} color="#65C737" />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>Tap to open camera</p>
                  </div>
                )}
                <button onClick={() => openCamera('live_photo')} className="btn-primary" style={{ padding: '14px', borderRadius: 14, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Camera size={18} />
                  {previews.live_photo ? 'Retake Photo' : 'Open Camera'}
                </button>
              </div>
            ) : (
              <DocUpload
                step={step}
                preview={previews[step.id]}
                onFile={handleFile}
                onCamera={() => openCamera(step.id)}
              />
            )}
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
    </>
  )
}

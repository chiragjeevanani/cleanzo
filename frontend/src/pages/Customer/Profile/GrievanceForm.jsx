import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Camera, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import apiClient from '../../../services/apiClient'
import { optimizeImage } from '../../../utils/imageOptimizer'
import { validateName, validateEmail, validatePhone, cleanPhoneNumber } from '../../../utils/helpers'

export default function GrievanceForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    issue: ''
  })
  
  const [attachment, setAttachment] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Sync user details if loaded late
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }))
    }
  }, [user])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Determine extension and ensure file has a valid name for backend upload
    const extension = file.type ? file.type.split('/')[1] : 'jpg';
    let cleanName = file.name || `capture_${Date.now()}.${extension}`;
    if (!cleanName.includes('.')) {
      cleanName = `${cleanName}.${extension}`;
    }

    const fileToOptimize = (file.name === cleanName) ? file : new File([file], cleanName, { type: file.type });
    
    try {
      const optimized = await optimizeImage(fileToOptimize, { maxWidth: 1000, quality: 0.7 })
      setAttachment(optimized)
      setPreview(URL.createObjectURL(optimized))
      setError('')
    } catch (err) {
      console.error('Image optimization failed:', err)
      const fallbackFile = (file.name === cleanName) ? file : new File([file], cleanName, { type: file.type });
      setAttachment(fallbackFile)
      setPreview(URL.createObjectURL(fallbackFile))
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
    setPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validations
    if (!form.name.trim()) return setError('Name is required')
    if (!validateName(form.name)) return setError('Name must contain only alphabetic characters')
    
    if (!validateEmail(form.email)) return setError('Please enter a valid email address')
    
    if (!validatePhone(form.phone)) return setError('Please enter a valid 10-digit mobile number (can start with 91)')
    
    if (!form.subject.trim()) return setError('Subject is required')
    if (!form.issue.trim()) return setError('Issue description is required')

    const cleanedPhone = cleanPhoneNumber(form.phone)

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('email', form.email)
      formData.append('phone', cleanedPhone)
      formData.append('subject', form.subject)
      formData.append('issue', form.issue)
      if (attachment) {
        formData.append('attachment', attachment)
      }

      await apiClient.uploadForm('/customer/grievances', formData)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to submit grievance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24, flexDirection: 'column', gap: 24, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(101,199,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={36} color="#65C737" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>Grievance Submitted</h2>
        <p className="text-secondary" style={{ maxWidth: 320, lineHeight: 1.6 }}>
          Your ticket has been recorded. Our admin team will review your request and get back to you shortly.
        </p>
        <button onClick={() => navigate(-1)} className="btn-primary" style={{ padding: '14px 32px', borderRadius: 14, fontSize: 16 }}>
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>
      {/* Header */}
      <div className="app-header" style={{ padding: '16px 0', marginBottom: 12 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-8 bg-transparent border-none text-[color:var(--text-primary)] cursor-pointer p-0">
          <ArrowLeft size={20} /> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>File a Grievance</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass flex flex-col gap-20" style={{ padding: 24, borderRadius: 24 }}>
        {/* Name */}
        <div>
          <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Full Name *</label>
          <input 
            className="input-field" 
            placeholder="e.g. John Doe" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} 
            style={{ width: '100%', padding: '14px 16px' }} 
          />
        </div>

        {/* Email & Phone */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email *</label>
            <input 
              className="input-field" 
              type="email" 
              placeholder="e.g. john@example.com" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              style={{ width: '100%', padding: '14px 16px' }} 
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Phone *</label>
            <input 
              className="input-field" 
              type="tel" 
              placeholder="e.g. 9876543210" 
              maxLength={10}
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
              style={{ width: '100%', padding: '14px 16px' }} 
            />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Subject *</label>
          <input 
            className="input-field" 
            placeholder="Briefly state your concern" 
            value={form.subject} 
            onChange={e => setForm({...form, subject: e.target.value})} 
            style={{ width: '100%', padding: '14px 16px' }} 
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Issue Description *</label>
          <textarea 
            className="input-field" 
            rows={4}
            placeholder="Describe your issue in detail..." 
            value={form.issue} 
            onChange={e => setForm({...form, issue: e.target.value})} 
            style={{ width: '100%', padding: '14px 16px', borderRadius: 16, resize: 'none' }} 
          />
        </div>

        {/* Attachment */}
        <div>
          <label className="text-label text-secondary mb-8 block" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Attachment (Optional)</label>
          
          {preview ? (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
              <img src={preview} alt="Attachment Preview" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              <button 
                type="button" 
                onClick={removeAttachment} 
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

          {/* Camera (direct capture on mobile) */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {/* Gallery / file picker */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading} 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '16px 0', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}
        >
          {loading ? (
            <><div style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Submitting...</>
          ) : (
            'Submit Grievance'
          )}
        </button>
      </form>
    </div>
  )
}

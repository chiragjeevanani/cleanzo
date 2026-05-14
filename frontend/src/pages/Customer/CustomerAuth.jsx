import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Phone, User, ShieldCheck, CheckCircle2, MapPin, Building2,
  Lock, Mail, Tag, Eye, EyeOff, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { INDIA_CITIES } from '../../data/cities'

// ─── Auth Confirm Dialog ─────────────────────────
function AuthConfirmDialog({ config, onClose }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content glass animate-scale-in" style={{ maxWidth: 360, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--primary-blue-rgb), 0.1)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ShieldCheck size={32} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          {config.type === 'not_found' ? 'Account Not Found' : 'Account Exists'}
        </h3>
        <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>{config.message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={config.action} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', background: 'var(--accent-lime)', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
            {config.type === 'not_found' ? 'Sign Up' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Input Field Helper ──────────────────────────
function Field({ label, icon: Icon, children, action }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="text-label text-secondary">{label}</label>
        {action}
      </div>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none', zIndex: 1 }} />}
        {children}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────
export default function CustomerAuth() {
  const navigate = useNavigate()
  const { user, loading: authLoading, login, loginWithPassword } = useAuth()

  // Redirect already-authenticated users to their portal
  useEffect(() => {
    if (authLoading || !user) return
    const role = user.role
    if (role === 'admin' || role === 'superadmin') navigate('/admin', { replace: true })
    else if (role === 'cleaner') navigate('/cleaner', { replace: true })
    else navigate('/customer', { replace: true })
  }, [user, authLoading, navigate])

  const [role, setRole] = useState('customer')   // customer | crew
  const [mode, setMode] = useState('login')       // login | signup
  const [step, setStep] = useState('form')        // form | otp | success | lead
  const [showPwd, setShowPwd] = useState(false)
  const [useOtp, setUseOtp] = useState(true)      // OTP vs password login

  const [societies, setSocieties] = useState([])
  const [filteredSocieties, setFilteredSocieties] = useState([])
  const [societySearch, setSocietySearch] = useState('')
  const [showSocietyDropdown, setShowSocietyDropdown] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    society: '', // Society ID
    societyName: '', // For lead capture
    area: '', // For lead capture
    pincode: '', // For lead capture
    referralCode: '',
    otp: ['', '', '', '', '', ''],
  })

  // Fetch societies
  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        const res = await apiClient.get('/public/societies/active')
        setSocieties(res.societies || [])
      } catch (err) {
        console.error('Failed to fetch societies', err)
      }
    }
    fetchSocieties()
  }, [])

  useEffect(() => {
    if (formData.city) {
      setFilteredSocieties(societies.filter(s => s.city === formData.city))
    } else {
      setFilteredSocieties([])
    }
  }, [formData.city, societies])

  const [timer, setTimer] = useState(30)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)

  const set = (field) => (e) => {
    setErrorMsg('')
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  // ── Lead Capture ──
  const handleCaptureLead = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      await apiClient.post('/public/leads', {
        name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        requestedArea: formData.area,
        requestedSociety: formData.societyName,
        pincode: formData.pincode
      })
      setStep('success')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit interest.')
    } finally {
      setLoading(false)
    }
  }

  // ── Send OTP ──
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^91/, '')
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number')
      return
    }

    if (mode === 'signup' && !formData.society) {
      setErrorMsg('Please select your society to continue')
      return
    }

    setLoading(true)
    try {
      await apiClient.post('/auth/send-otp', { phone: formData.phone, role, mode })
      setStep('otp')
      setTimer(30)
    } catch (err) {
      if (err.type === 'USER_NOT_FOUND') {
        setConfirmDialog({ type: 'not_found', message: err.message, action: () => { setMode('signup'); setConfirmDialog(null) } })
      } else if (err.type === 'USER_ALREADY_EXISTS') {
        setConfirmDialog({ type: 'already_exists', message: err.message, action: () => { setMode('login'); setConfirmDialog(null) } })
      } else {
        setErrorMsg(err.message || 'Failed to send OTP. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      const extra = mode === 'signup' ? {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        city: formData.city,
        society: formData.society,
        referralCode: formData.referralCode || undefined,
      } : {}

      const res = await login(formData.phone, formData.otp.join(''), role, extra)
      if (res.success) {
        setStep('success')
        setTimeout(() => navigate(role === 'crew' ? '/cleaner' : '/customer'), 1500)
      } else {
        setErrorMsg(res.message || 'Verification failed')
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // ── Password Login ──
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^91/, '')
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number')
      return
    }
    setLoading(true)
    try {
      const res = await loginWithPassword(formData.phone, formData.password, role)
      if (res.success) {
        setStep('success')
        setTimeout(() => navigate(role === 'crew' ? '/cleaner' : '/customer'), 1500)
      } else {
        setErrorMsg(res.message || 'Invalid credentials')
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpInput = (val, i) => {
    if (!/^\d*$/.test(val)) return
    const next = [...formData.otp]
    next[i] = val
    setFormData(prev => ({ ...prev, otp: next }))
    if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
  }

  const handleOtpKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !formData.otp[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < digits.length; i++) next[i] = digits[i]
    setFormData(prev => ({ ...prev, otp: next }))
    document.getElementById(`otp-${Math.min(digits.length, 5)}`)?.focus()
  }

  // ── Lead Capture Screen ──
  if (step === 'lead') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', zIndex: 1, padding: '20px', maxWidth: 460, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="reveal revealed" style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Request Service</h1>
          <p className="text-secondary" style={{ fontSize: 15 }}>Tell us where you stay and we'll notify you as soon as we launch there!</p>
        </div>
        <div className="glass" style={{ padding: 28, borderRadius: 28, border: '1px solid var(--border-glass)' }}>
           <form onSubmit={handleCaptureLead} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="First Name" icon={User}><input required className="input-field" style={inputStyle} value={formData.firstName} onChange={set('firstName')} /></Field>
                <Field label="Last Name"><input required className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.lastName} onChange={set('lastName')} /></Field>
              </div>
              <Field label="Phone Number" icon={Phone}><input required className="input-field" style={inputStyle} value={formData.phone} onChange={set('phone')} /></Field>
              <Field label="City" icon={MapPin}>
                <select required className="input-field" style={selectStyle} value={formData.city} onChange={set('city')}>
                  <option value="" disabled>Select City</option>
                  {INDIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Society Name" icon={Building2}><input required className="input-field" style={inputStyle} value={formData.societyName} onChange={set('societyName')} /></Field>
              <div style={{ display: 'flex', gap: 12 }}>
                <Field label="Area" icon={MapPin}><input required className="input-field" style={inputStyle} value={formData.area} onChange={set('area')} /></Field>
                <Field label="Pincode"><input required className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} value={formData.pincode} onChange={set('pincode')} maxLength={6} /></Field>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="button" className="btn-glass" style={{ flex: 1, padding: 14, borderRadius: 12 }} onClick={() => setStep('form')}>Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, padding: 14, borderRadius: 12 }}>{loading ? 'Submitting...' : 'Submit Request'}</button>
              </div>
           </form>
        </div>
      </div>
    </div>
  )

  // ── Success Screen ──
  if (step === 'success') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div className="glass reveal revealed" style={{ padding: 48, textAlign: 'center', maxWidth: 400, width: '100%', borderRadius: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(101,199,55,0.15)', color: 'var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          {mode === 'signup' && formData.societyName ? 'Interest Received!' : 'Welcome to Cleanzo!'}
        </h2>
        <p className="text-secondary">
          {mode === 'signup' && formData.societyName 
            ? `We've captured your details. We'll notify you as soon as we start serving ${formData.societyName}!` 
            : `Redirecting to your ${role === 'crew' ? 'crew' : 'customer'} dashboard…`}
        </p>
        {mode === 'signup' && formData.societyName && (
          <button className="btn-primary" style={{ marginTop: 24, padding: '12px 24px', borderRadius: 12 }} onClick={() => navigate('/')}>Back to Home</button>
        )}
      </div>
    </div>
  )

  const inputStyle = { paddingLeft: 48, width: '100%', boxSizing: 'border-box' }
  const selectStyle = { ...inputStyle, appearance: 'none', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      {confirmDialog && <AuthConfirmDialog config={confirmDialog} onClose={() => setConfirmDialog(null)} />}

      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(var(--accent-lime-rgb), 0.12) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(var(--primary-blue-rgb), 0.12) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '20px', maxWidth: 460, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Logo */}
        <header style={{ padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={24} color="#000" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>CLEANZO</span>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>
          
          {/* Role Switcher */}
          {step !== 'otp' && (
            <div className="glass" style={{ padding: 6, borderRadius: 16, display: 'flex', marginBottom: 28, position: 'relative', border: '1px solid var(--border-glass)' }}>
              <div style={{ position: 'absolute', top: 6, bottom: 6, left: role === 'customer' ? 6 : 'calc(50% + 3px)', width: 'calc(50% - 9px)', background: 'var(--accent-lime)', borderRadius: 12, transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 0, boxShadow: '0 4px 12px rgba(var(--accent-lime-rgb), 0.3)' }} />
              {[['customer', 'Customer'], ['crew', 'Crew / Executive']].map(([val, label]) => (
                <button key={val} onClick={() => { setRole(val); setErrorMsg(''); if (val === 'crew') setMode('login'); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'none', color: role === val ? '#000' : 'var(--text-secondary)', fontWeight: 700, fontSize: 14, position: 'relative', zIndex: 1, transition: 'color 0.3s', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="reveal" style={{ marginBottom: 28, textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, marginBottom: 10, lineHeight: 1.1 }}>
              {step === 'otp' ? 'Verify Identity' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-secondary" style={{ maxWidth: '80%', margin: '0 auto', fontSize: 15 }}>
              {step === 'otp'
                ? 'Enter the 6-digit code sent to your phone.'
                : mode === 'login'
                  ? `Sign in to your ${role === 'crew' ? 'crew' : 'customer'} portal.`
                  : `Join the Cleanzo ${role === 'crew' ? 'crew' : 'family'} today.`}
            </p>
          </div>

          <div className="glass" style={{ padding: 28, borderRadius: 28, border: '1px solid var(--border-glass)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            
            {/* Mode toggle */}
            {step === 'form' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, borderBottom: '1px solid var(--border-glass)', width: '100%' }}>
                <div style={{ display: 'flex', gap: 24 }}>
                  <button onClick={() => { setMode('login'); setErrorMsg(''); setUseOtp(true) }} style={{ paddingBottom: 12, color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 16, transition: 'all 0.3s', background: 'none', border: 'none', cursor: 'pointer', borderBottom: mode === 'login' ? '2px solid var(--accent-lime)' : 'none' }}>Login</button>
                  {role === 'customer' && (
                    <button onClick={() => { setMode('signup'); setErrorMsg(''); setUseOtp(true) }} style={{ paddingBottom: 12, color: mode === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: 16, transition: 'all 0.3s', background: 'none', border: 'none', cursor: 'pointer', borderBottom: mode === 'signup' ? '2px solid var(--accent-lime)' : 'none' }}>Sign Up</button>
                  )}
                </div>
                {role === 'crew' && (
                  <a href="/join-crew" className="chip chip-lime" style={{ marginBottom: 12, fontSize: 11, fontWeight: 800, padding: '8px 16px', textDecoration: 'none' }}>JOIN CREW</a>
                )}
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5555', flexShrink: 0 }} />
                {errorMsg}
              </div>
            )}

            {/* OTP Step */}
            {step === 'otp' ? (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <button type="button" onClick={() => { setStep('form'); setFormData(p => ({ ...p, otp: ['', '', '', '', '', ''] })) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0, width: 'fit-content' }}>
                  ← Edit number
                </button>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', width: '100%' }}>
                  {formData.otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleOtpInput(e.target.value, i)}
                      onKeyDown={e => handleOtpKeyDown(e, i)}
                      onPaste={handleOtpPaste}
                      style={{ 
                        flex: 1,
                        maxWidth: 64,
                        aspectRatio: '1/1',
                        height: 'auto',
                        textAlign: 'center', 
                        fontSize: 22, 
                        fontWeight: 700, 
                        borderRadius: 14, 
                        border: '2px solid var(--border-glass)', 
                        background: 'var(--bg-secondary)', 
                        color: 'var(--text-primary)', 
                        outline: 'none', 
                        transition: 'border-color 0.2s',
                        minWidth: 0
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent-lime)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-glass)'}
                    />
                  ))}
                </div>
                <button type="submit" disabled={loading || formData.otp.join('').length < 6} className="btn-primary" style={{ padding: '16px', borderRadius: 14, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Verifying…' : 'Verify Account'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {timer > 0 ? `Request new code in ${timer}s` : (
                    <button type="button" onClick={handleSendOtp} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontWeight: 600, cursor: 'pointer' }}>Resend OTP</button>
                  )}
                </p>
              </form>

            ) : mode === 'login' && !useOtp ? (
              /* PASSWORD LOGIN FORM */
              <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Field label="Phone Number" icon={Phone}>
                  <input required className="input-field" style={inputStyle} placeholder="10-digit number" inputMode="numeric" maxLength={10}
                    value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
                </Field>
                <Field label="Password" icon={Lock}
                  action={<button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 13, cursor: 'pointer' }}>{showPwd ? 'Hide' : 'Show'}</button>}>
                  <input required className="input-field" style={{ ...inputStyle, paddingRight: 48 }} placeholder="Your password" type={showPwd ? 'text' : 'password'}
                    value={formData.password} onChange={set('password')} />
                </Field>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '16px', borderRadius: 14, fontSize: 16, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <button type="button" onClick={() => setUseOtp(true)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontWeight: 600, cursor: 'pointer' }}>Use OTP instead</button>
                  {' · '}
                  <button type="button" onClick={() => navigate('/forgot-password')} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>Forgot password?</button>
                </p>
              </form>

            ) : (
              /* OTP REQUEST / SIGNUP FORM */
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* SIGNUP FIELDS */}
                {mode === 'signup' && (
                  <>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Field label="First Name" icon={User}>
                        <input required className="input-field" style={inputStyle} placeholder="First name"
                          value={formData.firstName}
                          onChange={e => setFormData(p => ({ ...p, firstName: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))} />
                      </Field>
                      <Field label="Last Name" icon={null}>
                        <input required className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Last name"
                          value={formData.lastName}
                          onChange={e => setFormData(p => ({ ...p, lastName: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))} />
                      </Field>
                    </div>

                    <Field label="Email Address" icon={Mail}>
                      <input required type="email" className="input-field" style={inputStyle} placeholder="you@example.com"
                        value={formData.email} onChange={set('email')} />
                    </Field>

                    <Field label="Password" icon={Lock}
                      action={<button type="button" onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 13, cursor: 'pointer' }}>{showPwd ? 'Hide' : 'Show'}</button>}>
                      <input required className="input-field" style={{ ...inputStyle, paddingRight: 48 }} placeholder="Min 8 characters" type={showPwd ? 'text' : 'password'} minLength={8}
                        value={formData.password} onChange={set('password')} />
                    </Field>

                    <Field label="City" icon={MapPin}>
                      <select required className="input-field" style={selectStyle} value={formData.city} onChange={set('city')}>
                        <option value="" disabled>Select your city</option>
                        {INDIA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} />
                    </Field>

                    <Field label="Society" icon={Building2} action={
                      <button type="button" onClick={() => setStep('lead')} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 12, cursor: 'pointer' }}>
                        Society not listed?
                      </button>
                    }>
                      <div style={{ position: 'relative' }}>
                        <input 
                          required 
                          className="input-field" 
                          style={inputStyle} 
                          placeholder="Search your society..." 
                          value={societySearch}
                          onFocus={() => setShowSocietyDropdown(true)}
                          onChange={(e) => {
                            setSocietySearch(e.target.value)
                            setShowSocietyDropdown(true)
                          }}
                        />
                        {showSocietyDropdown && (
                          <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-lg)' }}>
                            {filteredSocieties.filter(s => s.name.toLowerCase().includes(societySearch.toLowerCase())).length === 0 ? (
                              <div style={{ padding: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                                No societies found in this city. <br/>
                                <button type="button" onClick={() => setStep('lead')} style={{ color: 'var(--primary-blue)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>Request your area</button>
                              </div>
                            ) : (
                              filteredSocieties.filter(s => s.name.toLowerCase().includes(societySearch.toLowerCase())).map(s => (
                                <div 
                                  key={s._id} 
                                  onClick={() => {
                                    setFormData(p => ({ ...p, society: s._id }));
                                    setSocietySearch(s.name);
                                    setShowSocietyDropdown(false);
                                  }}
                                  style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 14, transition: 'background 0.2s', borderBottom: '1px solid var(--border-glass)' }}
                                  onMouseEnter={(e) => e.target.style.background = 'rgba(var(--accent-lime-rgb), 0.1)'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                                  <div style={{ fontSize: 11, opacity: 0.6 }}>{s.area}, {s.pincode}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </Field>

                    <Field label="Referral Code (optional)" icon={Tag}>
                      <input className="input-field" style={inputStyle} placeholder="Enter referral code"
                        value={formData.referralCode} onChange={set('referralCode')} />
                    </Field>
                  </>
                )}

                {/* PHONE FIELD */}
                <Field label="Phone Number" icon={Phone}
                  action={mode === 'login' && (
                    <button type="button" onClick={() => setUseOtp(false)} style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Use Password
                    </button>
                  )}>
                  <input required className="input-field" style={inputStyle} placeholder="10-digit number" inputMode="numeric" maxLength={10}
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
                </Field>

                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '16px', borderRadius: 14, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending…' : mode === 'login' ? 'Send OTP' : 'Create Account'}
                </button>

                {role === 'crew' && mode === 'login' && (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>
                    New to Cleanzo? <a href="/join-crew" style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>Apply to join our crew</a>
                  </p>
                )}
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            Protected by Cleanzo Security. <a href="/terms" style={{ color: 'var(--primary-blue)' }}>Terms</a> applied.
          </p>
        </main>
      </div>
    </div>
  )
}

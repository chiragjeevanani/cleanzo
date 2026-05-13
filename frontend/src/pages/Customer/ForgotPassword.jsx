import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: enter phone, 2: enter OTP + new password
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef([])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return }
    setLoading(true)
    setError('')
    try {
      await apiClient.post('/auth/forgot-password', { phone })
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus()
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the 6-digit OTP'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      await apiClient.post('/auth/reset-password', { phone, code, newPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Check your OTP and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24, flexDirection: 'column', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(101,199,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>Password Reset!</h2>
        <p className="text-secondary" style={{ maxWidth: 280 }}>Your password has been updated. You can now sign in with your new password.</p>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', padding: '24px 20px' }}>
      <button onClick={() => step === 1 ? navigate('/login') : setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 0, marginBottom: 32, fontSize: 16 }}>
        <ArrowLeft size={20} />
      </button>

      <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          {step === 1 ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p className="text-secondary" style={{ marginBottom: 32 }}>
          {step === 1
            ? 'Enter your registered phone number and we\'ll send you an OTP.'
            : `Enter the 6-digit OTP sent to +91 ${phone} and your new password.`}
        </p>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 44 }}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading || phone.length !== 10} className="btn btn-primary" style={{ padding: 16, borderRadius: 14, fontSize: 16, opacity: (loading || phone.length !== 10) ? 0.7 : 1 }}>
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 12 }}>6-digit OTP</label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, borderRadius: 12, border: `1.5px solid ${d ? 'var(--primary-blue)' : 'var(--border-glass)'}`, background: 'var(--bg-glass)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 44, paddingRight: 48 }}
                  placeholder="Min 8 characters"
                  type={showPwd ? 'text' : 'password'}
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--primary-blue)', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: 16, borderRadius: 14, fontSize: 16, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

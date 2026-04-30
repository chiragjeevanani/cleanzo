import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function CustomerAuth() {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('phone') // phone, otp
  const [otp, setOtp] = useState(['', '', '', ''])

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <img src="/cleanzo Logo.png" alt="Cleanzo" style={{ height: 48, margin: '0 auto 16px' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Welcome to Cleanzo</h1>
        <p className="text-body-md text-secondary" style={{ marginTop: 8 }}>Sign in to manage your car care</p>
      </div>

      <div className="glass" style={{ padding: 28 }}>
        {step === 'phone' ? (
          <>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>Phone Number</label>
            <div className="flex gap-8" style={{ marginBottom: 20 }}>
              <div className="input-field" style={{ width: 64, textAlign: 'center', flexShrink: 0 }}>+91</div>
              <input className="input-field" type="tel" placeholder="Enter phone number" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} />
            </div>
            <button className="btn btn-primary w-full" onClick={() => setStep('otp')}>Send OTP</button>
          </>
        ) : (
          <>
            <button onClick={() => setStep('phone')} className="flex items-center gap-8 text-body-sm text-secondary" style={{ marginBottom: 20 }}>
              <ArrowLeft size={16} /> Change number
            </button>
            <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 8 }}>Enter OTP sent to +91 {phone}</label>
            <div className="flex gap-12" style={{ justifyContent: 'center', marginBottom: 24 }}>
              {otp.map((d, i) => (
                <input key={i} className="input-field" type="text" maxLength={1} value={d}
                  style={{ width: 52, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    const next = [...otp]; next[i] = val; setOtp(next)
                    if (val && i < 3) e.target.nextElementSibling?.focus()
                  }}
                />
              ))}
            </div>
            <Link to="/customer" className="btn btn-primary w-full">Verify & Continue</Link>
            <button className="text-body-sm text-secondary w-full" style={{ marginTop: 16, textAlign: 'center' }}>
              Resend OTP in 30s
            </button>
          </>
        )}
      </div>
    </div>
  )
}

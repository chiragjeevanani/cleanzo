import { useState, useEffect } from 'react'
import { User, Landmark, ShieldAlert, KeyRound, Save, CheckCircle } from 'lucide-react'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'
import { useToast } from '../../context/ToastContext'
import { useSocietyAuth } from '../../context/SocietyAuthContext'

export default function SocietyProfile() {
  const { showToast } = useToast()
  const { updateSocietyUser } = useSocietyAuth()

  // Loading & Saving state
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [error, setError] = useState('')

  // Contact Info
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [societyName, setSocietyName] = useState('')
  const [commissionRate, setCommissionRate] = useState(0)
  const [addressDetails, setAddressDetails] = useState('')

  // Saved Payout/Bank Info
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/society/profile')
        if (res.success && res.profile) {
          const profile = res.profile
          setContactName(profile.contactName || '')
          setPhone(profile.phone || '')
          setEmail(profile.email || '')
          setCommissionRate(profile.commissionRate || 0)
          
          if (profile.society) {
            setSocietyName(profile.society.name || '')
            const parts = [
              profile.society.address,
              profile.society.area,
              profile.society.city,
              profile.society.pincode
            ].filter(Boolean)
            setAddressDetails(parts.join(', '))
          }

          const bd = profile.bankDetails || {}
          setAccountName(bd.accountName || '')
          setAccountNumber(bd.accountNumber || '')
          setBankName(bd.bankName || '')
          setIfscCode(bd.ifscCode || '')
          setUpiId(bd.upiId || '')
        } else {
          setError(res.message || 'Failed to fetch profile info')
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch profile info')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()

    if (accountNumber) {
      if (accountNumber.length < 9 || accountNumber.length > 18 || !/^\d+$/.test(accountNumber)) {
        showToast('Account number must be between 9 and 18 digits', 'error')
        return
      }
    }
    if (ifscCode) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        showToast('Invalid IFSC code format (e.g. HDFC0001234)', 'error')
        return
      }
    }
    if (upiId) {
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
        showToast('Invalid UPI ID format (e.g. name@upi)', 'error')
        return
      }
    }

    setSavingProfile(true)
    try {
      const res = await apiClient.put('/society/profile', {
        contactName,
        phone,
        bankDetails: {
          accountName,
          accountNumber,
          bankName,
          ifscCode,
          upiId
        }
      })

      if (res.success && res.profile) {
        // Sync context
        updateSocietyUser({
          contactName: res.profile.contactName,
          phone: res.profile.phone,
          bankDetails: res.profile.bankDetails
        })
        showToast('Profile & bank details updated successfully!', 'success')
      } else {
        showToast(res.message || 'Failed to save changes', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Failed to save changes', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showToast('Confirm password does not match new password', 'error')
      return
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const res = await apiClient.put('/society/profile/change-password', {
        currentPassword,
        newPassword
      })

      if (res.success) {
        showToast('Password updated successfully!', 'success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showToast(res.message || 'Password update failed', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Password update failed', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) return <PageLoader />

  if (error) {
    return (
      <div className="glass-solid text-center" style={{ padding: 40, margin: '20px auto', maxWidth: 500 }}>
        <h3 style={{ color: 'var(--error)', marginBottom: 12 }}>Error Loading Profile</h3>
        <p className="text-secondary" style={{ marginBottom: 20 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
          Partner Profile
        </h1>
        <p className="text-secondary">Manage contact, bank details, and account security</p>
      </div>

      <div className="profile-grid">
        
        {/* Left Column: Profile & Payout details */}
        <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Contact Details Card */}
          <div className="glass-solid" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--divider)', paddingBottom: 16 }}>
              <div style={{ color: 'var(--primary-blue)' }}><User size={22} /></div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Contact Information</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Contact Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter contact person name"
                    className="input-field"
                    value={contactName}
                    onChange={e => setContactName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  />
                </div>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Phone Number</label>
                  <input 
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter phone number"
                    className="input-field"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Login Email</label>
                  <input 
                    type="email" 
                    disabled 
                    className="input-field" 
                    value={email}
                    style={{ background: 'var(--bg-glass)', opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Linked Society</label>
                  <input 
                    type="text" 
                    disabled 
                    className="input-field" 
                    value={societyName}
                    style={{ background: 'var(--bg-glass)', opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {addressDetails && (
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Address</label>
                  <textarea 
                    disabled 
                    className="input-field" 
                    value={addressDetails}
                    rows={2}
                    style={{ background: 'var(--bg-glass)', opacity: 0.7, cursor: 'not-allowed', resize: 'none' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Saved Payout Details Card */}
          <div className="glass-solid" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--divider)', paddingBottom: 16 }}>
              <div style={{ color: 'var(--success)' }}><Landmark size={22} /></div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Saved Payout Details</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Account Holder Name</label>
                  <input 
                    type="text" 
                    placeholder="Saved name on account"
                    className="input-field"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  />
                </div>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Account Number</label>
                  <input 
                    type="text" 
                    placeholder="Saved account number"
                    className="input-field"
                    inputMode="numeric"
                    maxLength={18}
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. HDFC Bank"
                    className="input-field"
                    value={bankName}
                    onChange={e => setBankName(e.target.value.replace(/[^a-zA-Z\s&.]/g, ''))}
                  />
                </div>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>IFSC Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. HDFC0001234"
                    className="input-field"
                    maxLength={11}
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--divider)', paddingTop: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Saved UPI ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. name@upi" 
                  className="input-field" 
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button type="submit" className="btn btn-blue" disabled={savingProfile} style={{ minWidth: 160 }}>
                <Save size={16} />
                <span>{savingProfile ? 'Saving...' : 'Save Profile Info'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Info & Password Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* Comm Rate display */}
          <div className="glass" style={{ 
            padding: 32, 
            background: 'linear-gradient(135deg, rgba(var(--primary-blue-rgb), 0.12) 0%, rgba(var(--bg-accent-rgb), 0.02) 100%)',
            border: '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ color: 'var(--accent-lime)' }}><CheckCircle size={22} /></div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Partnership Program</h4>
            </div>
            <p className="text-secondary" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 16 }}>
              Your society is actively partnered. The current setup credits you:
            </p>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary-blue)', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {commissionRate}%
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>commission per subscription</span>
            </div>
          </div>

          {/* Change Password Card */}
          <form onSubmit={handlePasswordSubmit} className="glass-solid" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--divider)', paddingBottom: 16 }}>
              <div style={{ color: 'var(--error)' }}><KeyRound size={22} /></div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Security</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Current Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  className="input-field" 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>New Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="At least 8 characters" 
                  className="input-field" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="Repeat new password" 
                  className="input-field" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button type="submit" className="btn btn-blue" disabled={changingPassword} style={{ width: '100%' }}>
                <KeyRound size={16} />
                <span>{changingPassword ? 'Updating...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

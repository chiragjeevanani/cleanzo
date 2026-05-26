import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { Sun, Moon, Shield, Bell, Globe, Save, Upload, RefreshCw, Trash2, Settings } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [contact, setContact] = useState(user?.email || user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // --- Operational Configurations State ---
  const [priorityFeeSetting, setPriorityFeeSetting] = useState(99)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/admin/settings')
        if (res.success && res.settings) {
          const feeSetting = res.settings.find(s => s.key === 'prioritySlotFee')
          if (feeSetting) {
            setPriorityFeeSetting(feeSetting.value)
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    fetchSettings()
  }, [])

  const handleSavePriorityFee = async () => {
    setSavingSettings(true)
    try {
      await apiClient.put('/admin/settings/prioritySlotFee', { value: Number(priorityFeeSetting) })
      showToast('Priority slot surcharge fee updated successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update priority fee', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // --- Logo Management State ---
  const [logoConfig, setLogoConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('cleanzo_logo_config')
      return saved ? JSON.parse(saved) : { currentUrl: '/logo.png', history: [] }
    } catch {
      return { currentUrl: '/logo.png', history: [] }
    }
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!['image/png', 'image/svg+xml', 'image/jpeg'].includes(file.type)) {
      showToast('Only PNG, SVG, and JPEG formats are supported', 'error')
      return
    }
    
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.uploadForm('/admin/upload', formData)
      
      const newLogoUrl = res.imageUrl
      if (newLogoUrl) {
        const newHistory = [...logoConfig.history]
        if (logoConfig.currentUrl && logoConfig.currentUrl !== '/logo.png') {
          if (!newHistory.some(h => h.url === logoConfig.currentUrl)) {
            newHistory.unshift({
              url: logoConfig.currentUrl,
              timestamp: new Date().toLocaleString()
            })
          }
        }
        
        const newConfig = {
          currentUrl: newLogoUrl,
          history: newHistory
        }
        
        setLogoConfig(newConfig)
        localStorage.setItem('cleanzo_logo_config', JSON.stringify(newConfig))
        showToast('Logo updated successfully!', 'success')
      }
    } catch (err) {
      showToast(err?.message || 'Failed to upload logo', 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRestoreLogo = (historyItem) => {
    const newHistory = logoConfig.history.filter(h => h.url !== historyItem.url)
    
    if (logoConfig.currentUrl && logoConfig.currentUrl !== '/logo.png') {
      if (!newHistory.some(h => h.url === logoConfig.currentUrl)) {
        newHistory.unshift({
          url: logoConfig.currentUrl,
          timestamp: new Date().toLocaleString()
        })
      }
    }
    
    const newConfig = {
      currentUrl: historyItem.url,
      history: newHistory
    }
    
    setLogoConfig(newConfig)
    localStorage.setItem('cleanzo_logo_config', JSON.stringify(newConfig))
    showToast('Previous logo version restored!', 'success')
  }

  const handleDeleteHistory = (urlToDelete) => {
    if (!window.confirm('Are you sure you want to delete this logo from history?')) return
    const newConfig = {
      ...logoConfig,
      history: logoConfig.history.filter(h => h.url !== urlToDelete)
    }
    setLogoConfig(newConfig)
    localStorage.setItem('cleanzo_logo_config', JSON.stringify(newConfig))
    showToast('Logo deleted from history', 'success')
  }

  const handleResetDefaultLogo = () => {
    if (!window.confirm('Reset to system default logo?')) return
    
    const newHistory = [...logoConfig.history]
    if (logoConfig.currentUrl && logoConfig.currentUrl !== '/logo.png') {
      if (!newHistory.some(h => h.url === logoConfig.currentUrl)) {
        newHistory.unshift({
          url: logoConfig.currentUrl,
          timestamp: new Date().toLocaleString()
        })
      }
    }
    
    const newConfig = {
      currentUrl: '/logo.png',
      history: newHistory
    }
    
    setLogoConfig(newConfig)
    localStorage.setItem('cleanzo_logo_config', JSON.stringify(newConfig))
    showToast('Reset to default logo', 'success')
  }

  const [emailNotifs, setEmailNotifs] = useState(() => localStorage.getItem('pref_email') !== 'false')
  const [twoFA, setTwoFA] = useState(() => localStorage.getItem('pref_2fa') === 'true')

  const togglePref = (key, value, setter) => {
    setter(value)
    localStorage.setItem(key, value)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await apiClient.put('/admin/profile', { name, email: contact })
      if (updateUser) updateUser(res.admin || res.user || {})
      showToast('Profile saved successfully')
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <div style={{ maxWidth: 640 }}>
        {/* Admin Profile */}
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Admin Profile</span>
          <div className="flex flex-col gap-16">
            {saveError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', fontSize: 13 }}>
                {saveError}
              </div>
            )}
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Name</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Email / Phone</label>
              <input className="input-field" value={contact} onChange={e => setContact(e.target.value)} />
            </div>
            <button className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start' }} onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Appearance</span>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-12">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <span>Dark Mode</span>
            </div>
            <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, background: theme === 'dark' ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: theme === 'dark' ? '#0A0A0A' : 'var(--text-primary)', transition: 'transform var(--transition-fast)', transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>
        </div>

        {/* Logo Management */}
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 6 }}>Logo Management</span>
          <p className="text-secondary" style={{ fontSize: 13, marginBottom: 20 }}>
            Configure and replace the global application logo (PNG or SVG recommended). Active changes instantly propagate across all public and secure platforms.
          </p>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Active Preview */}
            <div style={{
              width: 140, height: 140, borderRadius: 20, border: '1px solid var(--border-glass)',
              background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: 12, position: 'relative', overflow: 'hidden'
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Active Logo</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <img src={logoConfig.currentUrl} alt="Active Logo" style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain' }} />
              </div>
              {logoConfig.currentUrl !== '/logo.png' && (
                <button onClick={handleResetDefaultLogo} className="chip chip-ghost" style={{ fontSize: 9, padding: '3px 8px', marginTop: 8, cursor: 'pointer', border: 'none' }}>
                  Reset Default
                </button>
              )}
            </div>

            {/* Upload Area */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <label style={{
                border: '2px dashed var(--border-glass)', borderRadius: 20, height: 140,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: uploadingLogo ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.01)',
                transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => !uploadingLogo && (e.currentTarget.style.borderColor = 'var(--accent-lime)')}
              onMouseLeave={e => !uploadingLogo && (e.currentTarget.style.borderColor = 'var(--border-glass)')}>
                <input type="file" onChange={handleLogoUpload} disabled={uploadingLogo} accept="image/png, image/svg+xml, image/jpeg" style={{ display: 'none' }} />
                
                {uploadingLogo ? (
                  <div className="flex flex-col items-center gap-12">
                    <div style={{ width: 28, height: 28, border: '2.5px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-lime)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Uploading Brand Asset...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-8" style={{ padding: 20, textAlign: 'center' }}>
                    <Upload size={24} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Upload Logo Asset</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>PNG, SVG, or JPEG (Max 2MB)</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Backup Version History */}
          {logoConfig.history && logoConfig.history.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--divider)', paddingTop: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Version History Backup</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {logoConfig.history.map((item, index) => (
                  <div key={index} className="flex justify-between items-center glass" style={{ padding: '12px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                    <div className="flex items-center gap-16">
                      <div style={{ width: 60, height: 36, background: '#0d0d0d', borderRadius: 8, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={item.url} alt="Backup Logo" style={{ maxWidth: '100%', maxHeight: 28, objectFit: 'contain' }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 500, display: 'block', color: 'var(--text-secondary)' }}>Archived Version</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Saved: {item.timestamp}</span>
                      </div>
                    </div>
                    <div className="flex gap-8">
                      <button onClick={() => handleRestoreLogo(item)} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={12} /> Restore
                      </button>
                      <button onClick={() => handleDeleteHistory(item.url)} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, borderRadius: 10, color: 'var(--error)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operational Configurations */}
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <div className="flex items-center gap-12" style={{ marginBottom: 16 }}>
            <Settings size={20} style={{ color: 'var(--accent-lime)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block' }}>Operational Configurations</span>
          </div>
          <p className="text-secondary" style={{ fontSize: 13, marginBottom: 20 }}>
            Manage core booking mechanics, priority surcharges, and service parameters.
          </p>
          <div className="flex flex-col gap-16">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Priority Slot Surcharge (₹)</label>
              <div className="flex gap-12">
                <input 
                  type="number" 
                  className="input-field" 
                  style={{ maxWidth: 150 }} 
                  value={priorityFeeSetting} 
                  onChange={e => setPriorityFeeSetting(e.target.value)} 
                  placeholder="e.g. 99"
                  min="0"
                />
                <button 
                  className="btn btn-blue btn-sm" 
                  style={{ background: 'var(--accent-lime)', color: '#000', fontWeight: 600 }} 
                  onClick={handleSavePriorityFee} 
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Saving...' : 'Save Surcharge'}
                </button>
              </div>
              <span className="text-muted" style={{ display: 'block', marginTop: 6, fontSize: 11 }}>
                Surcharge fee applied automatically during premium override or when slots are full.
              </span>
            </div>
          </div>
        </div>

        {/* Other settings */}
        <div className="glass" style={{ padding: 24 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Preferences</span>
          <div className="flex flex-col gap-16">
            {/* Email Notifications */}
            <div className="flex justify-between items-center" style={{ paddingBottom: 16, borderBottom: '1px solid var(--divider)' }}>
              <div className="flex items-center gap-12">
                <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Email Notifications</div>
                  <div className="text-body-sm text-tertiary">Receive daily summary emails</div>
                </div>
              </div>
              <button onClick={() => togglePref('pref_email', !emailNotifs, setEmailNotifs)}
                style={{ width: 40, height: 22, borderRadius: 11, background: emailNotifs ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2, transition: 'background 0.25s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: emailNotifs ? '#0A0A0A' : 'var(--text-tertiary)', transform: emailNotifs ? 'translateX(18px)' : 'translateX(0)', transition: 'transform var(--transition-fast)' }} />
              </button>
            </div>

            {/* Two-Factor Auth */}
            <div className="flex justify-between items-center" style={{ paddingBottom: 16, borderBottom: '1px solid var(--divider)' }}>
              <div className="flex items-center gap-12">
                <Shield size={18} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Two-Factor Auth</div>
                  <div className="text-body-sm text-tertiary">Extra security for admin login</div>
                </div>
              </div>
              <button onClick={() => togglePref('pref_2fa', !twoFA, setTwoFA)}
                style={{ width: 40, height: 22, borderRadius: 11, background: twoFA ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2, transition: 'background 0.25s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: twoFA ? '#0A0A0A' : 'var(--text-tertiary)', transform: twoFA ? 'translateX(18px)' : 'translateX(0)', transition: 'transform var(--transition-fast)' }} />
              </button>
            </div>

            {/* Language (display only) */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-12">
                <Globe size={18} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Language</div>
                  <div className="text-body-sm text-tertiary">English (India)</div>
                </div>
              </div>
              <span className="chip chip-ghost" style={{ fontSize: 11 }}>EN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

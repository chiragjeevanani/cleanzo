import { useState, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { Sun, Moon, Save, Settings } from 'lucide-react'
import apiClient from '../../services/apiClient'
import { useToast } from '../../context/ToastContext'

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme()
  const { user, updateUser, setLogoUrls } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [contact, setContact] = useState(user?.email || user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // --- Operational Configurations State ---
  const [priorityFeeSetting, setPriorityFeeSetting] = useState(99)
  const [savingSettings, setSavingSettings] = useState(false)

  // --- Logo Management State ---
  const [darkLogo, setDarkLogo] = useState(localStorage.getItem('cleanzo_dark_logo') || '/logo.png')
  const [lightLogo, setLightLogo] = useState(localStorage.getItem('cleanzo_light_logo') || '/logo.png')
  const [uploadingDark, setUploadingDark] = useState(false)
  const [uploadingLight, setUploadingLight] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/admin/settings')
        if (res.success && res.settings) {
          const feeSetting = res.settings.find(s => s.key === 'prioritySlotFee')
          if (feeSetting) {
            setPriorityFeeSetting(feeSetting.value)
          }
          const darkSetting = res.settings.find(s => s.key === 'darkLogoUrl')
          const lightSetting = res.settings.find(s => s.key === 'lightLogoUrl')
          if (darkSetting) {
            setDarkLogo(darkSetting.value)
            localStorage.setItem('cleanzo_dark_logo', darkSetting.value)
          }
          if (lightSetting) {
            setLightLogo(lightSetting.value)
            localStorage.setItem('cleanzo_light_logo', lightSetting.value)
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    fetchSettings()
  }, [])

  const handleLogoUpload = async (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    
    if (!['image/png', 'image/svg+xml', 'image/jpeg'].includes(file.type)) {
      showToast('Only PNG, SVG, and JPEG formats are supported', 'error')
      return
    }
    
    const isDark = type === 'dark'
    if (isDark) setUploadingDark(true)
    else setUploadingLight(true)

    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await apiClient.uploadForm('/admin/upload', formData)
      
      const newLogoUrl = res.url
      if (newLogoUrl) {
        const settingKey = isDark ? 'darkLogoUrl' : 'lightLogoUrl'
        await apiClient.put(`/admin/settings/${settingKey}`, { value: newLogoUrl })
        
        if (isDark) {
          setDarkLogo(newLogoUrl)
          localStorage.setItem('cleanzo_dark_logo', newLogoUrl)
          setLogoUrls(prev => ({ ...prev, dark: newLogoUrl }))
        } else {
          setLightLogo(newLogoUrl)
          localStorage.setItem('cleanzo_light_logo', newLogoUrl)
          setLogoUrls(prev => ({ ...prev, light: newLogoUrl }))
        }
        showToast(`${isDark ? 'Dark' : 'Light'} theme logo updated successfully!`, 'success')
      }
    } catch (err) {
      showToast(err?.message || 'Failed to upload logo', 'error')
    } finally {
      if (isDark) setUploadingDark(false)
      else setUploadingLight(false)
    }
  }

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
            Configure and replace the application logo for dark and light themes. Active changes instantly propagate across the entire app.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="grid-2">
            {/* Dark Theme Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Dark Theme Logo (on Dark Background)</span>
              <div style={{
                height: 140, borderRadius: 20, border: '1px solid var(--border-glass)',
                background: '#0d0d0d', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 12, position: 'relative', overflow: 'hidden'
              }}>
                <img src={darkLogo} alt="Dark Theme Logo" style={{ maxWidth: '80%', maxHeight: 80, objectFit: 'contain' }} />
              </div>
              <label style={{
                border: '2px dashed var(--border-glass)', borderRadius: 16, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploadingDark ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.01)',
                transition: 'all 0.2s', textAlign: 'center'
              }}>
                <input type="file" onChange={e => handleLogoUpload(e, 'dark')} disabled={uploadingDark} accept="image/png, image/svg+xml, image/jpeg" style={{ display: 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {uploadingDark ? 'Uploading...' : 'Upload Dark Logo'}
                </span>
              </label>
            </div>

            {/* Light Theme Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Light Theme Logo (on Light Background)</span>
              <div style={{
                height: 140, borderRadius: 20, border: '1px solid var(--border-glass)',
                background: '#f6f7f2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 12, position: 'relative', overflow: 'hidden'
              }}>
                <img src={lightLogo} alt="Light Theme Logo" style={{ maxWidth: '80%', maxHeight: 80, objectFit: 'contain' }} />
              </div>
              <label style={{
                border: '2px dashed var(--border-glass)', borderRadius: 16, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploadingLight ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.01)',
                transition: 'all 0.2s', textAlign: 'center'
              }}>
                <input type="file" onChange={e => handleLogoUpload(e, 'light')} disabled={uploadingLight} accept="image/png, image/svg+xml, image/jpeg" style={{ display: 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {uploadingLight ? 'Uploading...' : 'Upload Light Logo'}
                </span>
              </label>
            </div>
          </div>
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
      </div>
    </div>
  )
}

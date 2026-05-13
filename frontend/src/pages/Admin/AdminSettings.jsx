import { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { Sun, Moon, Shield, Bell, Globe, Save } from 'lucide-react'
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

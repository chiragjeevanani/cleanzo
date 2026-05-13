import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { ChevronRight, Car, Sun, Moon, LogOut, HelpCircle, Shield, Bell, MapPin, FileText, Loader2, Pencil, X, Check } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function CustomerProfile() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout, updateUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    city: user?.city || '',
  })

  const handleLogout = () => {
    setIsLoggingOut(true)
    logout()
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setEditError('')
    try {
      const res = await apiClient.put('/customer/profile', form)
      updateUser(res.user)
      setEditing(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const menuItems = [
    { icon: Car, label: 'My Vehicles', to: '/customer/vehicles' },
    { icon: MapPin, label: 'Saved Address', to: '/customer/addresses' },
    { icon: FileText, label: 'Terms of Service', to: '/customer/terms' },
    { icon: Shield, label: 'Privacy Policy', to: '/customer/privacy' },
    { icon: HelpCircle, label: 'Help and Support', to: '/customer/help' },
  ]

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ padding: '24px 0', textAlign: 'center', position: 'relative' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>
          {user?.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{user?.name || 'User'}</div>
        <div className="text-body-sm text-secondary">{user?.phone || user?.email || ''}</div>
        <button onClick={() => { setEditing(!editing); setEditError('') }} style={{ position: 'absolute', top: 24, right: 0, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          {editing ? <X size={14} /> : <Pencil size={14} />}
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          {editError && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 14, fontSize: 13 }}>
              {editError}
            </div>
          )}
          <div className="flex flex-col gap-12">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input-field" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>City</label>
              <input className="input-field" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Your city" />
            </div>
            <button className="btn btn-blue w-full" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <div className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="flex items-center gap-12">
          {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          <span style={{ fontWeight: 500 }}>Dark Mode</span>
        </div>
        <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, background: theme === 'dark' ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: theme === 'dark' ? '#0A0A0A' : 'var(--text-primary)', transition: 'transform var(--transition-fast)', transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      <div className="flex flex-col gap-4" style={{ marginBottom: 24 }}>
        {menuItems.map((m, i) => (
          <Link key={i} to={m.to} className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-12">
              <m.icon size={20} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontWeight: 500 }}>{m.label}</span>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
          </Link>
        ))}
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="btn btn-ghost w-full"
        style={{
          color: 'var(--error)',
          borderColor: 'rgba(255,69,58,0.2)',
          marginBottom: 100,
          background: isLoggingOut ? 'rgba(255,69,58,0.05)' : 'transparent',
          height: 52
        }}
      >
        {isLoggingOut ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Logging out...</span>
          </>
        ) : (
          <>
            <LogOut size={16} />
            <span>Sign Out</span>
          </>
        )}
      </button>
    </div>
  )
}

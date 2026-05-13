import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { User, Phone, Mail, Shield, Edit2, Check, X } from 'lucide-react'
import apiClient from '../../services/apiClient'

export default function AdminProfile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await apiClient.put('/auth/me', formData)
      if (res.user) updateUser(res.user)
      setSuccess('Profile updated successfully')
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const initials = (user?.name || 'A')[0].toUpperCase()

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>Profile</h1>
        <p className="text-secondary" style={{ fontSize: 14, marginTop: 4 }}>Manage your admin account details</p>
      </div>

      <div style={{ maxWidth: 600 }}>
        {/* Avatar + Role */}
        <div className="glass" style={{ padding: '32px 40px', borderRadius: 28, marginBottom: 20 }}>
          <div className="flex items-center gap-24">
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 32, fontFamily: 'var(--font-display)', color: '#0A0A0A',
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
                {user?.name || 'Admin'}
              </div>
              <div className="flex items-center gap-8" style={{ marginTop: 6 }}>
                <Shield size={14} style={{ color: 'var(--accent-lime)' }} />
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '4px 10px' }}>
                  {(user?.role || 'admin').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5555', marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(100,220,100,0.08)', border: '1px solid rgba(100,220,100,0.2)', color: 'var(--success)', marginBottom: 16, fontSize: 14 }}>
            {success}
          </div>
        )}

        {/* Details Card */}
        <div className="glass" style={{ padding: '32px 40px', borderRadius: 28 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 28 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Account Details</span>
            {!editing ? (
              <button className="btn btn-ghost btn-sm flex items-center gap-8" onClick={() => { setEditing(true); setSuccess('') }}>
                <Edit2 size={14} /> Edit
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm flex items-center gap-8" onClick={() => { setEditing(false); setError(''); setFormData({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' }) }}>
                <X size={14} /> Cancel
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="flex flex-col gap-20">
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>DISPLAY NAME</label>
                <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Admin Name" />
              </div>
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>EMAIL</label>
                <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="admin@cleanzo.in" />
              </div>
              <div className="flex flex-col gap-8">
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.12em', fontWeight: 600 }}>PHONE</label>
                <input className="input-field" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="9876543210" />
              </div>
              <button disabled={saving} className="btn btn-primary" type="submit"
                style={{ padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}>
                <Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-20">
              <InfoRow icon={<User size={16} />} label="Name" value={user?.name || '—'} />
              <InfoRow icon={<Mail size={16} />} label="Email" value={user?.email || '—'} />
              <InfoRow icon={<Phone size={16} />} label="Phone" value={user?.phone || '—'} />
              <InfoRow icon={<Shield size={16} />} label="Role" value={(user?.role || 'admin').toUpperCase()} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-16">
      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

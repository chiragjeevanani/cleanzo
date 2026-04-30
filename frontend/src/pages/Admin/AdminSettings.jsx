import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon, Shield, Bell, Globe, Save } from 'lucide-react'

export default function AdminSettings() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <div style={{ maxWidth: 640 }}>
        {/* Admin Profile */}
        <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>Admin Profile</span>
          <div className="flex flex-col gap-16">
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Name</label>
              <input className="input-field" defaultValue="Admin User" />
            </div>
            <div>
              <label className="text-label text-secondary" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input-field" defaultValue="admin@cleanzo.in" />
            </div>
            <button className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start' }}><Save size={14} /> Save Changes</button>
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
            {[
              { icon: Bell, label: 'Email Notifications', desc: 'Receive daily summary emails' },
              { icon: Shield, label: 'Two-Factor Auth', desc: 'Extra security for admin login' },
              { icon: Globe, label: 'Language', desc: 'English (India)' },
            ].map((s, i) => (
              <div key={i} className="flex justify-between items-center" style={{ paddingBottom: i < 2 ? 16 : 0, borderBottom: i < 2 ? '1px solid var(--divider)' : 'none' }}>
                <div className="flex items-center gap-12">
                  <s.icon size={18} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{s.label}</div>
                    <div className="text-body-sm text-tertiary">{s.desc}</div>
                  </div>
                </div>
                <button style={{ width: 40, height: 22, borderRadius: 11, background: 'var(--accent-lime)', position: 'relative', padding: 2 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: '#0A0A0A', transform: 'translateX(18px)', transition: 'transform var(--transition-fast)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

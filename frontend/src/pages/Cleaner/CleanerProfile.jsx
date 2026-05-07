import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { MapPin, Star, Award, Sun, Moon, LogOut, Loader2 } from 'lucide-react'

export default function CleanerProfile() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/cleaner')
    } catch (err) {
      console.error('Logout failed', err)
      setIsLoggingOut(false)
    }
  }
  const circumference = 2 * Math.PI * 40

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lime), var(--primary-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>
          {user?.name ? user.name[0].toUpperCase() : 'C'}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{user?.name || 'Cleaner'}</div>
        <div className="chip chip-lime" style={{ marginTop: 8 }}><Award size={12} /> {user?.role || 'Cleaner'}</div>
      </div>

      {/* Performance gauge */}
      <div className="glass" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-glass)" strokeWidth="5" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-lime)" strokeWidth="5"
              strokeDasharray={circumference} strokeDashoffset={circumference - (95 / 100) * circumference}
              strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>95%</span>
          </div>
        </div>
        <div className="text-body-sm text-secondary">Completion Rate</div>
      </div>

      <div className="flex flex-col gap-8" style={{ marginBottom: 20 }}>
        {[
          { icon: Star, label: 'Rating', value: `4.9 ★` },
          { icon: MapPin, label: 'Area', value: 'Central Zone' },
        ].map((r, i) => (
          <div key={i} className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-12">
              <r.icon size={18} style={{ color: 'var(--text-secondary)' }} />
              <span>{r.label}</span>
            </div>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="glass" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="flex items-center gap-12">
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          <span>Dark Mode</span>
        </div>
        <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, background: theme === 'dark' ? 'var(--accent-lime)' : 'var(--border-glass)', position: 'relative', padding: 2 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: theme === 'dark' ? '#0A0A0A' : 'var(--text-primary)', transition: 'transform var(--transition-fast)', transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      <button 
        onClick={handleLogout} 
        disabled={isLoggingOut}
        className="btn btn-ghost w-full" 
        style={{ color: 'var(--error)', borderColor: 'rgba(255,69,58,0.2)', marginBottom: 100, background: isLoggingOut ? 'rgba(255,69,58,0.05)' : 'transparent', height: 52 }}
      >
        {isLoggingOut ? (
          <><Loader2 size={16} className="animate-spin" /> <span>Logging out...</span></>
        ) : (
          <><LogOut size={16} /> <span>Sign Out</span></>
        )}
      </button>
    </div>
  )
}

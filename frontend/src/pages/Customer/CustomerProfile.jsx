import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { ChevronRight, Car, Sun, Moon, LogOut, HelpCircle, Shield, Bell, MapPin, FileText } from 'lucide-react'
import { mockUser } from '../../data/mockData'

export default function CustomerProfile() {
  const { theme, toggleTheme } = useTheme()

  const menuItems = [
    { icon: Car, label: 'My Vehicles', to: '/customer/vehicles' },
    { icon: MapPin, label: 'Saved Address', to: '/customer/addresses' },
    { icon: FileText, label: 'Terms of Service', to: '/customer/terms' },
    { icon: Shield, label: 'Privacy Policy', to: '/customer/privacy' },
    { icon: HelpCircle, label: 'Help and Support', to: '/customer/help' },
  ]

  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>
          {mockUser.name[0]}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{mockUser.name}</div>
        <div className="text-body-sm text-secondary">{mockUser.phone}</div>
      </div>

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

      <Link to="/" className="btn btn-ghost w-full" style={{ color: 'var(--error)', borderColor: 'rgba(255,69,58,0.2)', marginBottom: 100 }}>
        <LogOut size={16} /> Sign Out
      </Link>
    </div>
  )
}

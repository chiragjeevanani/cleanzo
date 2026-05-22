import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useSocietyAuth } from '../../context/SocietyAuthContext'
import { useTheme } from '../../context/ThemeContext'
import { LayoutDashboard, CreditCard, User, LogOut, Moon, Sun, Menu, X, ShieldCheck } from 'lucide-react'
import PageLoader from '../../components/PageLoader'
import ErrorBoundary from '../../components/ErrorBoundary'

const SocietyDashboard = lazy(() => import('./SocietyDashboard'))
const SocietyCommissions = lazy(() => import('./SocietyCommissions'))
const SocietyProfile = lazy(() => import('./SocietyProfile'))

const navItems = [
  { path: '/society/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/society/commissions', icon: CreditCard, label: 'Commissions' },
  { path: '/society/profile', icon: User, label: 'Profile' },
]

export default function SocietyApp() {
  const { societyUser, societyLoading, societyLogout } = useSocietyAuth()
  const navigate = useNavigate()
  
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (societyLoading) return <PageLoader />
  if (!societyUser) return <Navigate to="/society/login" replace />

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ transform: sidebarOpen ? 'none' : 'translateX(-100%)', zIndex: isMobile ? 100 : undefined }}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Cleanzo" />
          <span>Cleanzo Partner</span>
        </div>
        <div className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </div>
            </NavLink>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
          <div className="sidebar-nav-item" style={{ cursor: 'pointer' }} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div className="sidebar-nav-item" style={{ cursor: 'pointer', color: 'var(--error)' }} onClick={societyLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Header and main container */}
      <div className="admin-main" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 240 : 0), transition: 'margin-left var(--transition)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon btn-glass">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-12">
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Welcome,</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{societyUser.contactName}</span>
            <button
              onClick={() => navigate('/society/profile')}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'var(--font-display)',
                color: '#0A0A0A',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              {societyUser.contactName ? societyUser.contactName.charAt(0).toUpperCase() : 'S'}
            </button>
          </div>
        </div>

        <main className="admin-content-area">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="dashboard" element={<SocietyDashboard />} />
                <Route path="commissions" element={<SocietyCommissions />} />
                <Route path="profile" element={<SocietyProfile />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

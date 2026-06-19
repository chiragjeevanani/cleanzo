import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useSocietyAuth } from '../../context/SocietyAuthContext'
import { useTheme } from '../../context/ThemeContext'
import { LayoutDashboard, CreditCard, User, LogOut, Moon, Sun, Menu, X, ShieldCheck, Loader2 } from 'lucide-react'
import PageLoader from '../../components/PageLoader'
import ErrorBoundary from '../../components/ErrorBoundary'
import { getAppLogo } from '../../utils/helpers'

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
  const location = useLocation()
  
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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

  const handleLogout = async () => {
    setShowLogoutModal(false)
    setIsLoggingOut(true)
    try {
      await societyLogout()
    } catch (err) {
      console.error(err)
      setIsLoggingOut(false)
    }
  }

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
          <img src={getAppLogo(theme)} alt="Cleanzo" />
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
          <div className="sidebar-nav-item" style={{ cursor: 'pointer', color: 'var(--error)' }} onClick={() => setShowLogoutModal(true)}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Header and main container */}
      <div className="admin-main" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 240 : 0), transition: 'margin-left var(--transition)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 32, position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg-primary)', paddingTop: 12, paddingBottom: 12 }}>
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
              <div className="route-view" key={location.pathname}>
              <Routes>
                <Route path="dashboard" element={<SocietyDashboard />} />
                <Route path="commissions" element={<SocietyCommissions />} />
                <Route path="profile" element={<SocietyProfile />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => !isLoggingOut && setShowLogoutModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content glass animate-scale-in" style={{ padding: 24, borderRadius: 24, maxWidth: 380, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div className="flex items-center gap-12">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,69,58,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={20} style={{ color: 'var(--error)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>Sign Out?</h3>
              </div>
              {!isLoggingOut && (
                <button onClick={() => setShowLogoutModal(false)} className="btn-icon glass" style={{ width: 32, height: 32, borderRadius: 10 }}>
                  <X size={16} />
                </button>
              )}
            </div>

            <p className="text-body-sm text-secondary" style={{ marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to sign out of the Cleanzo Partner Panel?
            </p>

            <div className="flex flex-col gap-8">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="btn w-full"
                style={{ background: 'var(--error)', color: '#fff', height: 48, fontWeight: 700 }}
              >
                {isLoggingOut ? (
                  <><Loader2 size={16} className="animate-spin" /> <span>Signing out...</span></>
                ) : (
                  <><LogOut size={16} /> <span>Yes, Sign Out</span></>
                )}
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="btn btn-ghost w-full"
                style={{ height: 48 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

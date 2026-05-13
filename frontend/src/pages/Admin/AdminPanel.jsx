import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Users, UserCog, Package, CreditCard, TrendingUp, FileText, Settings, Sun, Moon, Bell, Search, Menu, X, LogOut, User } from 'lucide-react'
import PageLoader from '../../components/PageLoader'
import ErrorBoundary from '../../components/ErrorBoundary'

const AdminDashboard    = lazy(() => import('./AdminDashboard'))
const AdminUsers        = lazy(() => import('./AdminUsers'))
const AdminCleaners     = lazy(() => import('./AdminCleaners'))
const AdminPackages     = lazy(() => import('./AdminPackages'))
const AdminSubscriptions= lazy(() => import('./AdminSubscriptions'))
const AdminRevenue      = lazy(() => import('./AdminRevenue'))
const AdminContent      = lazy(() => import('./AdminContent'))
const AdminSettings     = lazy(() => import('./AdminSettings'))
const AdminApplications = lazy(() => import('./AdminApplications'))
const AdminProfile      = lazy(() => import('./AdminProfile'))
const AdminNotifications= lazy(() => import('./AdminNotifications'))

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/cleaners', icon: UserCog, label: 'Cleaners' },
  { path: '/admin/applications', icon: FileText, label: 'Applications' },
  { path: '/admin/packages', icon: Package, label: 'Packages' },
  { path: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { path: '/admin/revenue', icon: TrendingUp, label: 'Revenue' },
  { path: '/admin/content', icon: FileText, label: 'Content' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminPanel() {
  const { theme, toggleTheme } = useTheme()
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [globalSearch, setGlobalSearch] = useState('')

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (loading) return <PageLoader />
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return <Navigate to="/admin/login" replace />

  const handleLogout = () => {
    logout()
  }

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
          <span>Cleanzo</span>
        </div>
        <div className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.end}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
          <NavLink to="/admin/profile"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>Profile</span>
          </NavLink>
          <div className="sidebar-nav-item" style={{ cursor: 'pointer' }} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <div className="sidebar-nav-item" style={{ cursor: 'pointer', color: 'var(--error)' }} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main" style={{ marginLeft: isMobile ? 0 : (sidebarOpen ? 240 : 0), transition: 'margin-left var(--transition)' }}>
        {/* Top bar */}
        <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
          <div className="flex items-center gap-16">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon btn-glass">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ position: 'relative', width: 320 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input-field"
                placeholder="Search users, cleaners..."
                style={{ paddingLeft: 40 }}
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    navigate(`/admin/users?q=${encodeURIComponent(globalSearch.trim())}`)
                    setGlobalSearch('')
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-12">
            <button className="theme-toggle" onClick={() => navigate('/admin/notifications')}>
              <Bell size={18} />
            </button>
            <button
              onClick={() => navigate('/admin/profile')}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)', color: '#0A0A0A', cursor: 'pointer', border: 'none' }}>
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </button>
          </div>
        </div>

        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="cleaners" element={<AdminCleaners />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

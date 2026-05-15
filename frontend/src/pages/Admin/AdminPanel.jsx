import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Users, UserCog, Package, CreditCard, TrendingUp, FileText, Settings, Sun, Moon, Bell, Search, Menu, X, LogOut, User, MapPin, ShoppingCart } from 'lucide-react'
import PageLoader from '../../components/PageLoader'
import ErrorBoundary from '../../components/ErrorBoundary'
import apiClient from '../../services/apiClient'

const AdminDashboard    = lazy(() => import('./AdminDashboard'))
const AdminUsers        = lazy(() => import('./AdminUsers'))
const AdminUserDetails  = lazy(() => import('./AdminUserDetails'))
const AdminCleaners     = lazy(() => import('./AdminCleaners'))
const AdminCleanerDetails= lazy(() => import('./AdminCleanerDetails'))
const AdminPackages     = lazy(() => import('./AdminPackages'))
const AdminSubscriptions= lazy(() => import('./AdminSubscriptions'))
const AdminRevenue      = lazy(() => import('./AdminRevenue'))
const AdminContent      = lazy(() => import('./AdminContent'))
const AdminSettings     = lazy(() => import('./AdminSettings'))
const AdminApplications = lazy(() => import('./AdminApplications'))
const AdminSocieties    = lazy(() => import('./AdminSocieties'))
const AdminLeads        = lazy(() => import('./AdminLeads'))
const AdminProfile      = lazy(() => import('./AdminProfile'))
const AdminNotifications= lazy(() => import('./AdminNotifications'))
const AdminMarketplace  = lazy(() => import('./AdminMarketplace'))
const AdminVehicleCategories = lazy(() => import('./AdminVehicleCategories'))

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/cleaners', icon: UserCog, label: 'Cleaners' },
  { path: '/admin/applications', icon: FileText, label: 'Applications' },
  { path: '/admin/societies', icon: MapPin, label: 'Societies' },
  { path: '/admin/leads', icon: Users, label: 'Leads' },
  { path: '/admin/vehicle-categories', icon: MapPin, label: 'Vehicle Types' },
  { path: '/admin/packages', icon: Package, label: 'Packages' },
  { path: '/admin/marketplace', icon: ShoppingCart, label: 'Marketplace' },
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
  const [pendingCount, setPendingCount] = useState(0)
  const [globalSearch, setGlobalSearch] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/admin/badges')
        if (res.success) {
          setPendingCount(res.pendingApplicationsCount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch admin stats', err)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

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
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.label === 'Applications' && pendingCount > 0 && (
                  <span className="pending-badge">
                    {pendingCount}
                  </span>
                )}
              </div>
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

      <style>{`
        .pending-badge {
          margin-left: auto;
          background: var(--error);
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 8px;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 0 12px rgba(255, 50, 50, 0.4);
          animation: badgePulse 2s infinite;
        }
        @keyframes badgePulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 50, 50, 0.7); transform: scale(1); }
          70% { box-shadow: 0 0 0 6px rgba(255, 50, 50, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(255, 50, 50, 0); transform: scale(1); }
        }
      `}</style>

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
            <Route path="users/:id" element={<AdminUserDetails />} />
            <Route path="cleaners" element={<AdminCleaners />} />
            <Route path="cleaners/:id" element={<AdminCleanerDetails />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="societies" element={<AdminSocieties />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="marketplace" element={<AdminMarketplace />} />
            <Route path="vehicle-categories" element={<AdminVehicleCategories />} />
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

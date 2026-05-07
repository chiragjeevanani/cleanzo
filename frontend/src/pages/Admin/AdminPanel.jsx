import { useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Users, UserCog, Package, CreditCard, TrendingUp, FileText, Settings, Sun, Moon, Bell, Search, Menu, X, LogOut } from 'lucide-react'
import AdminDashboard from './AdminDashboard'
import AdminUsers from './AdminUsers'
import AdminCleaners from './AdminCleaners'
import AdminPackages from './AdminPackages'
import AdminSubscriptions from './AdminSubscriptions'
import AdminRevenue from './AdminRevenue'
import AdminContent from './AdminContent'
import AdminSettings from './AdminSettings'
import AdminApplications from './AdminApplications'

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/cleaners', icon: UserCog, label: 'Cleaners' },
  { path: '/admin/applications', icon: FileText, label: 'Applications' },
  { path: '/admin/packages', icon: Package, label: 'Packages' },
  { path: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { path: '/admin/revenue', icon: TrendingUp, label: 'Revenue' },
  { path: '/admin/content', icon: FileText, label: 'Content' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminPanel() {
  const { theme, toggleTheme } = useTheme()
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return <Navigate to="/admin/login" replace />

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/admin/login')
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ transform: sidebarOpen ? 'none' : 'translateX(-100%)' }}>
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
      <div className="admin-main" style={{ marginLeft: sidebarOpen ? 240 : 0, transition: 'margin-left var(--transition)' }}>
        {/* Top bar */}
        <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
          <div className="flex items-center gap-16">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon btn-glass" style={{ display: 'none' }}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ position: 'relative', width: 320 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input className="input-field" placeholder="Search users, cleaners, orders..." style={{ paddingLeft: 40 }} />
            </div>
          </div>
          <div className="flex items-center gap-12">
            <button className="theme-toggle" style={{ position: 'relative' }}>
              <Bell size={18} />
              <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--error)' }} />
            </button>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-blue), var(--accent-lime))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)', color: '#0A0A0A' }}>
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
          </div>
        </div>

        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="cleaners" element={<AdminCleaners />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  )
}

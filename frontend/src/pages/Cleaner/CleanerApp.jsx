import { useState, useEffect, lazy, Suspense } from 'react'
import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Clock, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import PageLoader from '../../components/PageLoader'
import ErrorBoundary from '../../components/ErrorBoundary'

const CleanerDashboard  = lazy(() => import('./CleanerDashboard'))
const CleanerTasks      = lazy(() => import('./CleanerTasks'))
const TaskDetail        = lazy(() => import('./TaskDetail'))
const PhotoUpload       = lazy(() => import('./PhotoUpload'))
const CleanerHistory    = lazy(() => import('./CleanerHistory'))
const CleanerProfile    = lazy(() => import('./CleanerProfile'))
const CleanerKYC        = lazy(() => import('./CleanerKYC'))
const CleanerEarnings   = lazy(() => import('./CleanerEarnings'))
const CleanerAttendance = lazy(() => import('./CleanerAttendance'))

const tabs = [
  { path: '/cleaner', icon: LayoutDashboard, label: 'Home', end: true },
  { path: '/cleaner/tasks', icon: ClipboardList, label: 'Tasks' },
  { path: '/cleaner/history', icon: Clock, label: 'History' },
  { path: '/cleaner/profile', icon: User, label: 'Profile' },
]

export default function CleanerApp() {
  const { user, loading } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user || user.role !== 'cleaner') return
    apiClient.get('/cleaner/tasks')
      .then(res => {
        const tasks = res.tasks || []
        setPendingCount(tasks.filter(t => t.status === 'pending').length)
      })
      .catch(() => {})
  }, [user])

  if (loading) return <PageLoader />
  if (!user || user.role !== 'cleaner') return <Navigate to="/login" replace />

  // New crew members must complete KYC before accessing the portal
  const kycPending = user.kycStatus === 'not_submitted'
  const kycRejected = user.kycStatus === 'rejected'

  return (
    <div className="app-shell">
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="kyc" element={<CleanerKYC />} />
          {kycPending || kycRejected ? (
            <Route path="*" element={<Navigate to="/cleaner/kyc" replace />} />
          ) : (
            <>
              <Route index element={<CleanerDashboard />} />
              <Route path="tasks" element={<CleanerTasks />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="upload" element={<PhotoUpload />} />
              <Route path="history" element={<CleanerHistory />} />
              <Route path="profile" element={<CleanerProfile />} />
              <Route path="earnings" element={<CleanerEarnings />} />
              <Route path="attendance" element={<CleanerAttendance />} />
              <Route path="*" element={<Navigate to="/cleaner" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
      </ErrorBoundary>

      {/* Hide bottom nav on KYC screen */}
      {!kycPending && !kycRejected && (
        <nav className="bottom-nav">
          {tabs.map(t => (
            <NavLink key={t.path} to={t.path} end={t.end} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <t.icon size={22} />
                {t.label === 'Tasks' && pendingCount > 0 && (
                  <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-lime)', boxShadow: '0 0 6px var(--accent-lime)' }} />
                )}
              </div>
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}


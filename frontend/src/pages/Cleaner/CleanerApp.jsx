import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Clock, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CleanerDashboard from './CleanerDashboard'
import CleanerTasks from './CleanerTasks'
import TaskDetail from './TaskDetail'
import PhotoUpload from './PhotoUpload'
import CleanerHistory from './CleanerHistory'
import CleanerProfile from './CleanerProfile'
import CleanerKYC from './CleanerKYC'
import CleanerEarnings from './CleanerEarnings'
import CleanerAttendance from './CleanerAttendance'

const tabs = [
  { path: '/cleaner', icon: LayoutDashboard, label: 'Home', end: true },
  { path: '/cleaner/tasks', icon: ClipboardList, label: 'Tasks' },
  { path: '/cleaner/history', icon: Clock, label: 'History' },
  { path: '/cleaner/profile', icon: User, label: 'Profile' },
]

export default function CleanerApp() {
  const { user, loading } = useAuth()

  if (loading) return <div className="loader-overlay"><div className="loader"></div></div>
  if (!user || user.role !== 'cleaner') return <Navigate to="/login" replace />

  // New crew members must complete KYC before accessing the portal
  const kycPending = user.kycStatus === 'not_submitted'
  const kycRejected = user.kycStatus === 'rejected'

  return (
    <div className="app-shell">
      <Routes>
        {/* KYC route — always accessible */}
        <Route path="kyc" element={<CleanerKYC />} />

        {/* Block portal access until KYC is submitted */}
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

      {/* Hide bottom nav on KYC screen */}
      {!kycPending && !kycRejected && (
        <nav className="bottom-nav">
          {tabs.map(t => (
            <NavLink key={t.path} to={t.path} end={t.end} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
              <t.icon size={22} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

